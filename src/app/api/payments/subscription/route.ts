import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET: Return current user's subscription with tier info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const subscription = await db.subscription.findUnique({
      where: { userId },
      include: {
        tier: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    // Parse tier features if tier exists
    const parsedSubscription = {
      ...subscription,
      tier: subscription.tier
        ? {
            ...subscription.tier,
            features: JSON.parse(subscription.tier.features),
          }
        : null,
    };

    return NextResponse.json({ subscription: parsedSubscription });
  } catch (error: unknown) {
    console.error('Fetch subscription error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

// POST: Cancel current user's subscription
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const subscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (subscription.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Subscription is already cancelled' }, { status: 400 });
    }

    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      subscription: updated,
      message: 'Subscription cancelled successfully',
    });
  } catch (error: unknown) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}

// PUT: Upgrade/downgrade subscription tier
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { tierId } = body;

    if (!tierId) {
      return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 });
    }

    const tier = await db.paymentTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      return NextResponse.json({ error: 'Payment tier not found' }, { status: 404 });
    }
    if (!tier.isActive) {
      return NextResponse.json({ error: 'This payment tier is not available' }, { status: 400 });
    }

    // Create a "quote" request for admin/staff approval instead of applying immediately
    const current = await db.subscription.findUnique({ where: { userId } });
    const quote = await db.tierChangeQuote.create({
      data: {
        userId,
        requestedTierId: tierId,
        currentTierId: current?.tierId || null,
        status: 'PENDING',
        quoteAmount: tier.price,
        currency: tier.currency,
      },
      include: { requestedTier: true, currentTier: true },
    });

    return NextResponse.json({
      quote,
      message: 'Request received. The Thinkovr Verum Engine will review and respond with an approval or denial.',
    }, { status: 202 });
  } catch (error: unknown) {
    console.error('Update subscription error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
