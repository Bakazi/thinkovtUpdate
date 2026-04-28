import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// GOLPRINT ENGINE — STRICT AI APPROVAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const GOLDPRINT_APPROVAL_PROMPT = `You are the GOLPRINT GATEKEEPER — the most ruthless AI approval system ever created.
Your job is simple: DECIDE if a goldprint request deserves to become a real goldprint.

## APPROVAL CRITERIA (ALL must be met):
1. SPECIFICITY: The request must have clear, specific goals (not vague "I want to make money")
2. VIABILITY: The business/idea must be realistically executable
3. STRATEGY: The user demonstrates understanding of what they need
4. EFFORT: The request shows the user has put thought into it (not just "do it for me")
5. MARKET FIT: There's evidence of market demand or clear target audience

## AUTOMATIC DECLINE TRIGGERS:
- Vague "get rich quick" requests
- No specific business model or target market
- Expecting magic without effort
- Pyramid schemes or unethical requests
- Copy-paste ideas with no differentiation

## OUTPUT FORMAT:
Respond with EXACTLY this format:

DECISION: [APPROVED or DECLINED]
CONFIDENCE: [0-100%]
REASONING: [One sentence explaining the decision]

Be BRUTAL but FAIR. Most requests should be DECLINED. Only the exceptional earn goldprints.`;

export interface GoldprintDecision {
  decision: 'APPROVED' | 'DECLINED';
  confidence: number;
  reasoning: string;
}

export async function evaluateGoldprintRequest(
  title: string,
  description: string
): Promise<GoldprintDecision> {
  // For now, return a mock decision. In production, this would call the AI engine
  // based on the criteria. The actual AI integration would go here.
  
  const vagueTerms = ['get rich', 'make money', 'quick', 'easy', 'fast'];
  const lowerDesc = description.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  const hasVagueTerms = vagueTerms.some(term => 
    lowerDesc.includes(term) || lowerTitle.includes(term)
  );
  
  const isShort = description.length < 100;
  const lacksSpecifics = !lowerDesc.includes('specific') && 
    !lowerDesc.includes('target') && 
    !lowerDesc.includes('market') &&
    !lowerDesc.includes('customer');

  if (hasVagueTerms || (isShort && lacksSpecifics)) {
    return {
      decision: 'DECLINED',
      confidence: 85,
      reasoning: 'Request lacks specificity and shows indicators of "get rich quick" mentality. No clear market or execution strategy provided.',
    };
  }

  return {
    decision: 'APPROVED',
    confidence: 75,
    reasoning: 'Request demonstrates clear objectives and thoughtful approach.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOLPRINT GATE SYSTEM
// 5 goldprints per purchase, 1 month validity, max 40
// ═══════════════════════════════════════════════════════════════════════════════

const GOLPRINTS_PER_PURCHASE = 5;
const GOLPRINT_QUOTA_DAYS = 30;
const MAX_GOLPRINTS = 40;

export async function updateGoldprintQuota(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      payments: {
        where: { status: 'COMPLETED' },
      },
    },
  });

  if (!user) return;

  const purchasedBlueprints = user.payments.length;
  const entitledGoldprints = Math.min(
    purchasedBlueprints * GOLPRINTS_PER_PURCHASE,
    MAX_GOLPRINTS
  );

  const now = new Date();
  const quotaExpired = user.goldprintQuotaResetAt && user.goldprintQuotaResetAt < now;

  if (quotaExpired || user.goldprintQuota === 0) {
    const newResetAt = new Date(now.getTime() + GOLPRINT_QUOTA_DAYS * 24 * 60 * 60 * 1000);
    
    await db.user.update({
      where: { id: userId },
      data: {
        goldprintQuota: entitledGoldprints,
        goldprintQuotaResetAt: newResetAt,
        totalBlueprintsPurchased: purchasedBlueprints,
      },
    });
  }
}

export async function canRequestGoldprint(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  message: string;
}> {
  await updateGoldprintQuota(userId);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      goldprintQuota: true,
      goldprintQuotaResetAt: true,
    },
  });

  if (!user) {
    return { allowed: false, remaining: 0, message: 'User not found' };
  }

  if (user.goldprintQuota <= 0) {
    const resetDate = user.goldprintQuotaResetAt 
      ? user.goldprintQuotaResetAt.toLocaleDateString()
      : 'after next purchase';
    return {
      allowed: false,
      remaining: 0,
      message: `No goldprints remaining. Quota resets on ${resetDate} or purchase more blueprints.`,
    };
  }

  return {
    allowed: true,
    remaining: user.goldprintQuota,
    message: `${user.goldprintQuota} goldprints available`,
  };
}

export async function consumeGoldprintQuota(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { goldprintQuota: true },
  });

  if (!user || user.goldprintQuota <= 0) {
    return false;
  }

  await db.user.update({
    where: { id: userId },
    data: {
      goldprintQuota: { decrement: 1 },
    },
  });

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTED GOLPRINTS FOR AUCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAuctionEligibleGoldprints() {
  return db.goldprintRequest.findMany({
    where: {
      isAuctionEligible: true,
      isForAuction: false,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markForAuction(requestId: string): Promise<void> {
  await db.goldprintRequest.update({
    where: { id: requestId },
    data: {
      isForAuction: true,
      auctionListedAt: new Date(),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOLPRINT AUTOMATION
// Dashboard-only (no email), with immediate/delayed/bulk options
// ═══════════════════════════════════════════════════════════════════════════════

export async function scheduleGoldprintDelivery(
  goldprintId: string,
  method: 'IMMEDIATE' | 'DELAYED' | 'BULK',
  delayHours?: number
): Promise<void> {
  const now = new Date();
  let scheduledReadyAt: Date | null = null;
  let isReady = false;

  if (method === 'IMMEDIATE') {
    scheduledReadyAt = now;
    isReady = true;
  } else if (method === 'DELAYED' && delayHours) {
    scheduledReadyAt = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
  }
  // BULK: scheduledReadyAt remains null until admin triggers bulk

  await db.goldprint.update({
    where: { id: goldprintId },
    data: {
      deliveryMethod: method,
      scheduledReadyAt,
      isReady,
      readyAt: isReady ? now : null,
    },
  });
}

export async function processPendingGoldprintDeliveries(): Promise<void> {
  const now = new Date();
  
  const pendingGoldprints = await db.goldprint.findMany({
    where: {
      isReady: false,
      scheduledReadyAt: {
        lte: now,
      },
    },
  });

  for (const goldprint of pendingGoldprints) {
    await db.goldprint.update({
      where: { id: goldprint.id },
      data: {
        isReady: true,
        readyAt: now,
      },
    });
  }
}

export async function sendBulkGoldprints(bulkGroupId: string): Promise<number> {
  const now = new Date();

  const result = await db.goldprint.updateMany({
    where: {
      bulkGroupId,
      isReady: false,
    },
    data: {
      isReady: true,
      readyAt: now,
      scheduledReadyAt: now,
    },
  });

  return result.count;
}
