import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    const userId = (session.user as { id: string }).id;

    let blueprints;

    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      blueprints = await db.blueprint.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      blueprints = await db.blueprint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ blueprints });
  } catch (error: unknown) {
    console.error('Fetch blueprints error:', error);
    return NextResponse.json({ error: 'Failed to fetch blueprints' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { title, idea } = body;

    if (!title || !idea) {
      return NextResponse.json(
        { error: 'Title and idea are required' },
        { status: 400 }
      );
    }

    const blueprint = await db.blueprint.create({
      data: {
        userId,
        title,
        idea,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ blueprint }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create blueprint error:', error);
    return NextResponse.json({ error: 'Failed to create blueprint' }, { status: 500 });
  }
}
