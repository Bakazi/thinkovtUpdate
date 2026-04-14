import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateWorkflowEmail } from '@/lib/verum-workflow';
import { sendEmailText } from '@/lib/email';

// User endpoints for requesting tier-change "quotes"
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const quotes = await db.tierChangeQuote.findMany({
      where: { userId },
      include: {
        requestedTier: true,
        currentTier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ quotes });
  } catch (e: unknown) {
    console.error('Fetch quotes error:', e);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { requestedTierId } = body as { requestedTierId?: string };
    if (!requestedTierId) return NextResponse.json({ error: 'requestedTierId is required' }, { status: 400 });

    const [requestedTier, subscription, user] = await Promise.all([
      db.paymentTier.findUnique({ where: { id: requestedTierId } }),
      db.subscription.findUnique({ where: { userId }, include: { tier: true } }),
      db.user.findUnique({ where: { id: userId } }),
    ]);

    if (!requestedTier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    if (!requestedTier.isActive) return NextResponse.json({ error: 'Tier is not available' }, { status: 400 });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const quote = await db.tierChangeQuote.create({
      data: {
        userId,
        requestedTierId,
        currentTierId: subscription?.tierId || null,
        status: 'PENDING',
        quoteAmount: requestedTier.price,
        currency: requestedTier.currency,
      },
      include: { requestedTier: true, currentTier: true },
    });

    // Email: "we'll be in touch"
    try {
      const { subject, body: emailBody } = await generateWorkflowEmail({
        state: 'NEW_REGISTRATION',
        userName: user.name || 'Operator',
        dashboardUrl: `${req.nextUrl.origin}/dashboard`,
      });
      await sendEmailText({ to: user.email, subject, body: emailBody });
    } catch (e) {
      console.error('Quote request email failed:', e);
    }

    return NextResponse.json({ quote }, { status: 201 });
  } catch (e: unknown) {
    console.error('Create quote error:', e);
    return NextResponse.json({ error: 'Failed to create quote request' }, { status: 500 });
  }
}

