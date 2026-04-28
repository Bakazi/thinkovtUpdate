import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { canRequestGoldprint, consumeGoldprintQuota, evaluateGoldprintRequest, getAuctionEligibleGoldprints } from '@/lib/goldprint-engine';

// GET /api/goldprint-requests - List user's requests or all for admin
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const where = session.user.role === 'ADMIN' || session.user.role === 'STAFF'
      ? {}
      : { userId: session.user.id };

    const requests = await db.goldprintRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Failed to fetch goldprint requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// POST /api/goldprint-requests - Create new request
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check quota
    const quotaCheck = await canRequestGoldprint(session.user.id);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: quotaCheck.message },
        { status: 403 }
      );
    }

    const { title, description } = await req.json();

    // Consume quota
    await consumeGoldprintQuota(session.user.id);

    // AI Evaluation
    const aiDecision = await evaluateGoldprintRequest(title, description);

    const request = await db.goldprintRequest.create({
      data: {
        userId: session.user.id,
        title,
        description,
        aiDecision: aiDecision.decision,
        aiReasoning: aiDecision.reasoning,
        aiReviewedAt: new Date(),
        // Auto-decline if AI says so
        status: aiDecision.decision === 'APPROVED' ? 'PENDING' : 'DECLINED',
        isAuctionEligible: aiDecision.decision === 'DECLINED',
      },
    });

    // If approved by AI, auto-create goldprint
    if (aiDecision.decision === 'APPROVED') {
      await db.goldprint.create({
        data: {
          userId: session.user.id,
          title,
          content: generateGoldprintContent(title, description),
          isReady: true,
          readyAt: new Date(),
        },
      });
    }

    return NextResponse.json({ 
      request,
      aiDecision,
      remaining: quotaCheck.remaining - 1,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create goldprint request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}

function generateGoldprintContent(title: string, description: string): string {
  return `# GOLPRINT: ${title}

## THE DICTATUM
${description}

## PREMIUM INTELLIGENCE
[AI-generated premium content would go here]

## EXECUTION ROADMAP
[Detailed step-by-step execution plan]

## RESOURCE REQUIREMENTS
[Tools, budget, time estimates]

This is your goldprint. Execute without deviation.
`;
}
