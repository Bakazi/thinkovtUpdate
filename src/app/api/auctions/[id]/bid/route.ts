import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/auctions/[id]/bid - Place a bid
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { amount } = await req.json();

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

    if (auction.status !== 'LIVE') {
      return NextResponse.json({ error: 'Auction is not live' }, { status: 400 });
    }

    if (new Date() > new Date(auction.endTime!)) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
    }

    // Check minimum bid
    const currentHighBid = auction.bids[0]?.amount || auction.startingBid;
    const minBid = Number(currentHighBid) + Number(auction.bidIncrement);

    if (amount < minBid) {
      return NextResponse.json(
        { error: `Minimum bid is ${minBid}` },
        { status: 400 }
      );
    }

    const bid = await db.bid.create({
      data: {
        auctionId: params.id,
        userId: session.user.id,
        amount,
      },
    });

    return NextResponse.json({ bid }, { status: 201 });
  } catch (error) {
    console.error('Failed to place bid:', error);
    return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 });
  }
}
