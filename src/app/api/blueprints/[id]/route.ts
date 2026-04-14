import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userRole = (session.user as { role: string }).role;
    const userId = (session.user as { id: string }).id;

    const blueprint = await db.blueprint.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!blueprint) {
      return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 });
    }

    // Users can only see their own blueprints
    if (userRole === 'USER' && blueprint.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ blueprint });
  } catch (error: unknown) {
    console.error('Fetch blueprint error:', error);
    return NextResponse.json({ error: 'Failed to fetch blueprint' }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await req.json();
    const { status, rejectionReason } = body;

    const blueprint = await db.blueprint.findUnique({ where: { id } });
    if (!blueprint) {
      return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 });
    }

    const updated = await db.blueprint.update({
      where: { id },
      data: {
        status: status || blueprint.status,
        rejectionReason: rejectionReason !== undefined ? rejectionReason : blueprint.rejectionReason,
        reviewedBy: (session.user as { id: string }).id,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ blueprint: updated });
  } catch (error: unknown) {
    console.error('Update blueprint error:', error);
    return NextResponse.json({ error: 'Failed to update blueprint' }, { status: 500 });
  }
}
