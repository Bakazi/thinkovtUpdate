import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 });
    }

    const payments = await db.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        blueprint: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({ payments });
  } catch (error: unknown) {
    console.error('Fetch payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
