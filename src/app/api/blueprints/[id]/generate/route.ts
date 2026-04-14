import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateBlueprint } from '@/lib/ai-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const blueprint = await db.blueprint.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!blueprint) {
      return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 });
    }

    // Check payment mode — if SUBSCRIPTION, verify user has allowance
    const paymentModeConfig = await db.aIConfig.findUnique({
      where: { key: 'PAYMENT_MODE' },
    });
    const paymentMode = paymentModeConfig?.value || 'SUBSCRIPTION';

    if (paymentMode === 'SUBSCRIPTION') {
      // Look up user's subscription tier
      const subscription = await db.subscription.findUnique({
        where: { userId: blueprint.userId },
        include: { tier: true },
      });

      let maxBlueprints = 1; // Default: Free tier = 1 blueprint
      let tierName = 'Free';

      if (subscription?.status === 'ACTIVE' && subscription.tier) {
        maxBlueprints = subscription.tier.maxBlueprints;
        tierName = subscription.tier.name;

        // Check if subscription is expired
        if (subscription.expiresAt && new Date() > subscription.expiresAt) {
          return NextResponse.json(
            { error: 'User subscription has expired' },
            { status: 403 }
          );
        }
      }

      // Count user's already-generated/approved blueprints this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const blueprintCount = await db.blueprint.count({
        where: {
          userId: blueprint.userId,
          status: { in: ['GENERATED', 'APPROVED'] },
          createdAt: { gte: startOfMonth },
        },
      });

      if (blueprintCount >= maxBlueprints) {
        return NextResponse.json(
          {
            error: `Blueprint limit reached. User has ${blueprintCount}/${maxBlueprints} blueprints on their ${tierName} plan.`,
          },
          { status: 403 }
        );
      }
    }
    // If PER_BLUEPRINT mode, admin can still generate — payment is collected from user after approval

    // Update status to GENERATING
    await db.blueprint.update({
      where: { id },
      data: { status: 'GENERATING' },
    });

    try {
      // Generate blueprint content using AI
      const content = await generateBlueprint(blueprint.idea, blueprint.title);

      // Update with generated content — keep as GENERATED for admin review
      const updated = await db.blueprint.update({
        where: { id },
        data: {
          status: 'GENERATED',
          content,
          reviewedBy: (session.user as { id: string }).id,
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json({ blueprint: updated, message: 'Blueprint generated successfully' });
    } catch (aiError: unknown) {
      const errMsg = aiError instanceof Error ? aiError.message : 'Unknown AI error';
      // Revert status back to PENDING on error
      await db.blueprint.update({
        where: { id },
        data: { status: 'PENDING' },
      });
      return NextResponse.json(
        { error: `AI generation failed: ${errMsg}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Generate blueprint error:', error);
    return NextResponse.json({ error: 'Failed to generate blueprint' }, { status: 500 });
  }
}
