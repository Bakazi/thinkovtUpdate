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
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 });
    }

    const configs = await db.aIConfig.findMany({
      orderBy: { key: 'asc' },
    });

    return NextResponse.json({ configs });
  } catch (error: unknown) {
    console.error('Fetch AI config error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const config = await db.aIConfig.upsert({
      where: { key },
      update: { value: value || '' },
      create: { key, value: value || '' },
    });

    return NextResponse.json({ config });
  } catch (error: unknown) {
    console.error('Update AI config error:', error);
    return NextResponse.json({ error: 'Failed to update AI config' }, { status: 500 });
  }
}
