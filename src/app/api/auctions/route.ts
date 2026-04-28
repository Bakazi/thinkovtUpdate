import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/auctions - List auctions with countdown info
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auctions = await db.auction.findMany({
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
        },
        _count: {
          select: { bids: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { endTime: 'asc' },
      ],
    });

    return NextResponse.json({ auctions });
  } catch (error) {
    console.error('Failed to fetch auctions:', error);
    return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 });
  }
}

// POST /api/auctions - Create auction (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      title,
      description,
      startTime,
      endTime,
      startingBid,
      bidIncrement,
      alertTimingMinutes,
      customAlertMessage,
      goldprintRequestId,
    } = await req.json();

    const auction = await db.auction.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        startingBid,
        bidIncrement: bidIncrement || 10,
        alertTimingMinutes: alertTimingMinutes || 10,
        customAlertMessage,
        createdBy: session.user.id,
        status: 'SCHEDULED',
      },
    });

    // If this auction is for a rejected goldprint, link it
    if (goldprintRequestId) {
      await db.goldprintRequest.update({
        where: { id: goldprintRequestId },
        data: { isForAuction: true, auctionListedAt: new Date() },
      });
    }

    return NextResponse.json({ auction }, { status: 201 });
  } catch (error) {
    console.error('Failed to create auction:', error);
    return NextResponse.json({ error: 'Failed to create auction' }, { status: 500 });
  }
}
