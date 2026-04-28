import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/auctions/[id]/start - Start auction (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auction = await db.auction.update({
      where: { id: params.id },
      data: {
        status: 'LIVE',
        startTime: new Date(),
      },
    });

    return NextResponse.json({ auction });
  } catch (error) {
    console.error('Failed to start auction:', error);
    return NextResponse.json({ error: 'Failed to start auction' }, { status: 500 });
  }
}
