import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmailText } from '@/lib/email';
import { generateText } from '@/lib/ai-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    const quote = await db.tierChangeQuote.findUnique({
      where: { id },
      include: { user: true, requestedTier: true, currentTier: true },
    });
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (quote.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { reason, priceTooHigh, timing, missingFeature, other } = body as Record<string, unknown>;

    const feedback = {
      reason: String(reason || ''),
      priceTooHigh: Boolean(priceTooHigh),
      timing: String(timing || ''),
      missingFeature: String(missingFeature || ''),
      other: String(other || ''),
      submittedAt: new Date().toISOString(),
    };

    await db.tierChangeQuote.update({
      where: { id },
      data: { denialFeedback: JSON.stringify(feedback) },
    });

    // Optional: notify staff mailbox via SMTP_FROM (or SMTP_USER) with a short AI summary
    try {
      const summary = await generateText({
        systemPrompt: 'Summarize this quote decline feedback in 3 bullet points for internal review.',
        userPrompt: JSON.stringify({ quoteId: id, feedback }),
        maxOutputTokens: 200,
      });

      const to = process.env.INTERNAL_NOTIFICATIONS_EMAIL || '';
      if (to) {
        await sendEmailText({
          to,
          subject: `Quote declined feedback — ${quote.user.email}`,
          body: summary,
        });
      }
    } catch (e) {
      console.error('Feedback notify failed:', e);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('Submit feedback error:', e);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

