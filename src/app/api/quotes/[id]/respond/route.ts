import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateWorkflowEmail } from '@/lib/verum-workflow';
import { sendEmailText } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await req.json();
    const { response } = body as { response?: 'ACCEPTED' | 'DENIED' };
    if (!response) return NextResponse.json({ error: 'response is required' }, { status: 400 });

    const quote = await db.tierChangeQuote.findUnique({
      where: { id },
      include: { user: true, requestedTier: true, currentTier: true },
    });
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (quote.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (quote.status !== 'QUOTED') return NextResponse.json({ error: 'Quote is not awaiting response' }, { status: 400 });

    if (response === 'ACCEPTED') {
      const updated = await db.tierChangeQuote.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      await db.subscription.upsert({
        where: { userId: quote.userId },
        update: {
          tierId: quote.requestedTierId,
          status: 'ACTIVE',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          userId: quote.userId,
          tierId: quote.requestedTierId,
          status: 'ACTIVE',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      try {
        const { subject, body: emailBody } = await generateWorkflowEmail({
          state: 'QUOTE_ACCEPTED',
          userName: quote.user?.name || 'Operator',
          quoteAmount: String(quote.quoteAmount ?? quote.requestedTier.price),
          dashboardUrl: `${req.nextUrl.origin}/dashboard`,
        });
        await sendEmailText({ to: quote.user.email, subject, body: emailBody });
      } catch (e) {
        console.error('Quote accepted email failed:', e);
      }

      return NextResponse.json({ quote: updated });
    }

    const updated = await db.tierChangeQuote.update({
      where: { id },
      data: { status: 'DENIED' },
    });

    const feedbackUrl = `${req.nextUrl.origin}/quote-feedback/${id}`;
    try {
      const { subject, body: emailBody } = await generateWorkflowEmail({
        state: 'QUOTE_DENIED',
        userName: quote.user?.name || 'Operator',
        quoteAmount: String(quote.quoteAmount ?? quote.requestedTier.price),
        dashboardUrl: feedbackUrl,
      });
      const appended = `${emailBody}\n\nQuick question so we can improve: ${feedbackUrl}\n`;
      await sendEmailText({ to: quote.user.email, subject, body: appended });
    } catch (e) {
      console.error('Quote denied email failed:', e);
    }

    return NextResponse.json({ quote: updated });
  } catch (e: unknown) {
    console.error('Quote response error:', e);
    return NextResponse.json({ error: 'Failed to process quote response' }, { status: 500 });
  }
}

