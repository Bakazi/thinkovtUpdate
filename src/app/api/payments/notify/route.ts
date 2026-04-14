import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

function generatePayFastSignature(data: Record<string, string>, passphrase: string): string {
  const sortedKeys = Object.keys(data).sort();
  const paramString = sortedKeys.map((k) => `${k}=${encodeURIComponent(data[k])}`).join('&');
  return crypto.createHash('md5').update(paramString + passphrase).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    // PayFast ITN — no auth required, called by PayFast server
    const body = await req.text();

    // Parse the incoming data
    const params = new URLSearchParams(body);
    const data: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      data[key] = value;
    }

    console.log('PayFast ITN received:', JSON.stringify(data));

    // Validate required fields
    const paymentStatus = data['payment_status'];
    const paymentRef = data['custom_str1']; // Our payment ID

    if (!paymentRef) {
      console.error('PayFast ITN: missing custom_str1 (payment reference)');
      return new Response('Missing payment reference', { status: 400 });
    }

    // Find the payment
    const payment = await db.payment.findUnique({
      where: { id: paymentRef },
    });

    if (!payment) {
      console.error('PayFast ITN: payment not found:', paymentRef);
      return new Response('Payment not found', { status: 404 });
    }

    // Validate security signature
    const configs = await db.aIConfig.findMany({
      where: {
        key: {
          in: ['PAYFAST_MERCHANT_ID', 'PAYFAST_MERCHANT_KEY', 'PAYFAST_PASSPHRASE'],
        },
      },
    });

    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    const passphrase = configMap['PAYFAST_PASSPHRASE'] || '';

    // Remove signature from data for validation
    const receivedSignature = data['signature'] || '';
    const dataForValidation: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'signature') {
        dataForValidation[key] = value;
      }
    }

    const expectedSignature = generatePayFastSignature(dataForValidation, passphrase);

    if (receivedSignature !== expectedSignature) {
      console.error('PayFast ITN: signature mismatch', {
        received: receivedSignature,
        expected: expectedSignature,
      });
      return new Response('Invalid signature', { status: 400 });
    }

    // Process payment status
    if (paymentStatus === 'COMPLETE') {
      // Update payment to COMPLETED
      await db.payment.update({
        where: { id: paymentRef },
        data: {
          status: 'COMPLETED',
          reference: data['pf_payment_id'] || null,
          payfastToken: data['token'] || null,
        },
      });

      // Handle subscription or per-blueprint payment
      if (payment.blueprintId) {
        // Per-blueprint payment — approve the blueprint
        await db.blueprint.update({
          where: { id: payment.blueprintId },
          data: {
            paymentId: payment.id,
            status: 'APPROVED',
          },
        });
        console.log(`Blueprint ${payment.blueprintId} approved after payment`);
      } else {
        // Subscription payment — create or update subscription
        const existingSubscription = await db.subscription.findUnique({
          where: { userId: payment.userId },
        });

        if (existingSubscription) {
          // Update existing subscription
          // Determine tier from description or use a default
          const tierName = payment.description?.replace('Monthly subscription: ', '') || '';
          let tierId = existingSubscription.tierId;

          if (tierName) {
            const tier = await db.paymentTier.findFirst({ where: { name: tierName } });
            if (tier) tierId = tier.id;
          }

          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await db.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              tierId,
              status: 'ACTIVE',
              startedAt: new Date(),
              expiresAt,
              payfastToken: data['token'] || null,
            },
          });
        } else {
          // Create new subscription
          const tierName = payment.description?.replace('Monthly subscription: ', '') || '';
          let tierId: string | null = null;

          if (tierName) {
            const tier = await db.paymentTier.findFirst({ where: { name: tierName } });
            if (tier) tierId = tier.id;
          }

          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await db.subscription.create({
            data: {
              userId: payment.userId,
              tierId,
              status: 'ACTIVE',
              startedAt: new Date(),
              expiresAt,
              payfastToken: data['token'] || null,
            },
          });
        }
        console.log(`Subscription created/updated for user ${payment.userId}`);
      }
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      await db.payment.update({
        where: { id: paymentRef },
        data: {
          status: paymentStatus === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
          reference: data['pf_payment_id'] || null,
        },
      });
      console.log(`Payment ${paymentRef} marked as ${paymentStatus}`);
    }

    return new Response('200 OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error: unknown) {
    console.error('PayFast ITN error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
