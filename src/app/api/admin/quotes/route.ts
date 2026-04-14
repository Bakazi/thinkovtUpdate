import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateWorkflowEmail } from '@/lib/verum-workflow';
import { sendEmailText } from '@/lib/email';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as { role: string }).role;
    if (role !== 'ADMIN' && role !== 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const quotes = await db.tierChangeQuote.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        requestedTier: true,
        currentTier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totals = {
      pending: quotes.filter((q) => q.status === 'PENDING').length,
      approved: quotes.filter((q) => q.status === 'APPROVED').length,
      denied: quotes.filter((q) => q.status === 'DENIED').length,
    };

    return NextResponse.json({ quotes, totals });
  } catch (e: unknown) {
    console.error('Fetch admin quotes error:', e);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as { role: string }).role;
    if (role !== 'ADMIN' && role !== 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { quoteId, action, denialReason, quoteAmount } = body as {
      quoteId?: string;
      action?: 'send_quote' | 'deny';
      denialReason?: string;
      quoteAmount?: number;
    };

    if (!quoteId || !action) {
      return NextResponse.json({ error: 'quoteId and action are required' }, { status: 400 });
    }

    const quote = await db.tierChangeQuote.findUnique({
      where: { id: quoteId },
      include: { user: true, requestedTier: true, currentTier: true },
    });
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    if (action === 'send_quote') {
      const amount =
        typeof quoteAmount === 'number' && Number.isFinite(quoteAmount)
          ? quoteAmount
          : (quote.quoteAmount ?? quote.requestedTier.price);

      const updatedQuote = await db.tierChangeQuote.update({
        where: { id: quoteId },
        data: {
          status: 'QUOTED',
          quoteAmount: amount,
          decidedBy: (session.user as { id: string }).id,
          decidedAt: new Date(),
          denialReason: null,
        },
        include: { user: true, requestedTier: true, currentTier: true },
      });

      try {
        const { subject, body: emailBody } = await generateWorkflowEmail({
          state: 'BLUEPRINT_DECISION_ACCEPTED',
          userName: quote.user?.name || 'Operator',
          quoteAmount: String(amount),
          dashboardUrl: `${req.nextUrl.origin}/dashboard`,
        });
        await sendEmailText({ to: quote.user.email, subject, body: emailBody });
      } catch (e) {
        console.error('Approve quote email failed:', e);
      }

      return NextResponse.json({ quote: updatedQuote });
    }

    // deny
    const updatedQuote = await db.tierChangeQuote.update({
      where: { id: quoteId },
      data: {
        status: 'DENIED',
        decidedBy: (session.user as { id: string }).id,
        decidedAt: new Date(),
        denialReason: denialReason || 'Declined',
      },
      include: { user: true, requestedTier: true, currentTier: true },
    });

    const feedbackUrl = `${req.nextUrl.origin}/quote-feedback/${quoteId}`;
    try {
      const { subject, body: emailBody } = await generateWorkflowEmail({
        state: 'QUOTE_DENIED',
        userName: quote.user?.name || 'Operator',
        quoteAmount: String(quote.quoteAmount ?? quote.requestedTier.price),
        dashboardUrl: feedbackUrl,
      });
      const appended =
        `${emailBody}\n\nQuick question so we can improve: please tell us why you declined here:\n${feedbackUrl}\n`;
      await sendEmailText({ to: quote.user.email, subject, body: appended });
    } catch (e) {
      console.error('Deny quote email failed:', e);
    }

    return NextResponse.json({ quote: updatedQuote });
  } catch (e: unknown) {
    console.error('Update quote error:', e);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}

