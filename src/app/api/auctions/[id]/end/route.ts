import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/auctions/[id]/end - End auction (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auction = await db.auction.findUnique({
      where: { id: params.id },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const hasBids = auction.bids.length > 0;

    if (hasBids) {
      // End with winner
      const winner = auction.bids[0];
      await db.auction.update({
        where: { id: params.id },
        data: {
          status: 'ENDED',
          winnerId: winner.userId,
          winningBid: winner.amount,
          endTime: new Date(),
        },
      });

      // TODO: Create blackprint for winner
    } else {
      // No-show
      await db.auction.update({
        where: { id: params.id },
        data: {
          status: 'NO_SHOW',
          endTime: new Date(),
        },
      });

      // TODO: Create greyprint for admin review
    }

    return NextResponse.json({
      success: true,
      status: hasBids ? 'ENDED' : 'NO_SHOW',
      winner: hasBids ? auction.bids[0] : null,
    });
  } catch (error) {
    console.error('Failed to end auction:', error);
    return NextResponse.json({ error: 'Failed to end auction' }, { status: 500 });
  }
}
