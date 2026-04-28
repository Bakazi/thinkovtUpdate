import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/auctions/[id] - Get auction details with countdown
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auction = await db.auction.findUnique({
      where: { id: params.id },
      include: {
        bids: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { amount: 'desc' },
        },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    return NextResponse.json({ auction });
  } catch (error) {
    console.error('Failed to fetch auction:', error);
    return NextResponse.json({ error: 'Failed to fetch auction' }, { status: 500 });
  }
}

// PATCH /api/auctions/[id] - Update auction (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    } = await req.json();

    const auction = await db.auction.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(startingBid !== undefined && { startingBid }),
        ...(bidIncrement && { bidIncrement }),
        ...(alertTimingMinutes && { alertTimingMinutes }),
        ...(customAlertMessage && { customAlertMessage }),
      },
    });

    return NextResponse.json({ auction });
  } catch (error) {
    console.error('Failed to update auction:', error);
    return NextResponse.json({ error: 'Failed to update auction' }, { status: 500 });
  }
}
