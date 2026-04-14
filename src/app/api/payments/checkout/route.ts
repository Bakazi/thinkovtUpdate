import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import crypto from 'crypto';

function generatePayFastSignature(data: Record<string, string>, passphrase: string): string {
  const sortedKeys = Object.keys(data).sort();
  const paramString = sortedKeys.map((k) => `${k}=${encodeURIComponent(data[k])}`).join('&');
  return crypto.createHash('md5').update(paramString + passphrase).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { tierId, blueprintId } = body;

    if (!tierId && !blueprintId) {
      return NextResponse.json({ error: 'Either tierId or blueprintId is required' }, { status: 400 });
    }

    if (tierId && blueprintId) {
      return NextResponse.json({ error: 'Provide either tierId or blueprintId, not both' }, { status: 400 });
    }

    // Fetch PayFast configuration from AIConfig
    const configs = await db.aIConfig.findMany({
      where: {
        key: {
          in: ['PAYFAST_MERCHANT_ID', 'PAYFAST_MERCHANT_KEY', 'PAYFAST_BASE_URL', 'PAYFAST_PASSPHRASE'],
        },
      },
    });

    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    const merchantId = configMap['PAYFAST_MERCHANT_ID'];
    const merchantKey = configMap['PAYFAST_MERCHANT_KEY'];
    const baseUrl = configMap['PAYFAST_BASE_URL'] || 'https://sandbox.payfast.co.za';
    const passphrase = configMap['PAYFAST_PASSPHRASE'] || '';

    if (!merchantId || !merchantKey) {
      return NextResponse.json(
        { error: 'Payment gateway is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const origin = req.headers.get('origin') || req.headers.get('host') || 'http://localhost:3000';
    const protocol = origin.startsWith('http') ? '' : 'https://';
    const baseOrigin = origin.startsWith('http') ? origin : `${protocol}${origin}`;

    let amount = 0;
    let itemName = '';
    let description = '';
    let paymentBlueprintId: string | undefined;

    if (tierId) {
      // Subscription checkout
      const tier = await db.paymentTier.findUnique({ where: { id: tierId } });
      if (!tier) {
        return NextResponse.json({ error: 'Payment tier not found' }, { status: 404 });
      }
      if (!tier.isActive) {
        return NextResponse.json({ error: 'This payment tier is not available' }, { status: 400 });
      }

      amount = tier.price;
      itemName = `Subscription - ${tier.name}`;
      description = `Monthly subscription: ${tier.name}`;
    } else if (blueprintId) {
      // Per-blueprint checkout
      const blueprint = await db.blueprint.findUnique({
        where: { id: blueprintId },
      });
      if (!blueprint) {
        return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 });
      }
      if (blueprint.userId !== userId) {
        return NextResponse.json({ error: 'You can only pay for your own blueprints' }, { status: 403 });
      }

      // Check if blueprint already has a completed payment
      if (blueprint.paymentId) {
        const existingPayment = await db.payment.findUnique({ where: { id: blueprint.paymentId } });
        if (existingPayment && existingPayment.status === 'COMPLETED') {
          return NextResponse.json({ error: 'This blueprint has already been paid for' }, { status: 400 });
        }
      }

      // Get per-blueprint price from config, default to 49.99
      const perBlueprintPrice = await db.aIConfig.findUnique({
        where: { key: 'BLUEPRINT_PRICE_PER' },
      });
      amount = perBlueprintPrice ? parseFloat(perBlueprintPrice.value) : 97;
      itemName = `Blueprint - ${blueprint.title}`;
      description = `Payment for blueprint: ${blueprint.title}`;
      paymentBlueprintId = blueprintId;
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // Create Payment record
    const payment = await db.payment.create({
      data: {
        userId,
        blueprintId: paymentBlueprintId || null,
        amount,
        currency: 'ZAR',
        method: 'PAYFAST',
        status: 'PENDING',
        description,
      },
    });

    // Build PayFast form data
    const pfData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${baseOrigin}/api/payments/success`,
      cancel_url: `${baseOrigin}/api/payments/cancel`,
      notify_url: `${baseOrigin}/api/payments/notify`,
      amount: amount.toFixed(2),
      item_name: itemName,
      custom_str1: payment.id,
    };

    // Generate signature
    const signature = generatePayFastSignature(pfData, passphrase);
    pfData['signature'] = signature;

    // Build redirect URL with query parameters
    const redirectUrl = `${baseUrl}/eng/process?${new URLSearchParams(pfData).toString()}`;

    return NextResponse.json({
      paymentId: payment.id,
      redirectUrl,
    });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
