import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateAuditResponse } from '@/lib/ai-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, plan } = body;

    if (!email || !plan) {
      return NextResponse.json(
        { error: 'Email and plan description are required' },
        { status: 400 }
      );
    }

    // Check if email already submitted (one per person)
    const existing = await db.auditSubmission.findFirst({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted a free audit. One per person.' },
        { status: 409 }
      );
    }

    // Create the submission
    const submission = await db.auditSubmission.create({
      data: {
        email,
        plan,
        status: 'PROCESSING',
      },
    });

    // Generate AI audit response (fire-and-forget style but we await)
    try {
      const result = await generateAuditResponse(email, plan);
      await db.auditSubmission.update({
        where: { id: submission.id },
        data: {
          result,
          status: 'COMPLETED',
        },
      });
    } catch (aiError) {
      console.error('Audit AI error:', aiError);
      // Don't fail the request — the submission is saved, audit will be processed later
    }

    return NextResponse.json(
      {
        message: 'Audit submitted successfully. The Engine will deliver your verdict within 72 hours.',
        submissionId: submission.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Audit submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit audit' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Admin-only: get all audit submissions
    const { searchParams } = new URL(req.url);
    const adminKey = searchParams.get('admin');

    if (adminKey !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submissions = await db.auditSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ submissions });
  } catch (error: unknown) {
    console.error('Fetch audits error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audits' },
      { status: 500 }
    );
  }
}
