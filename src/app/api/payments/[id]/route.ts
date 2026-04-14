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
    const userId = (session.user as { id: string }).id;
    const userRole = (session.user as { role: string }).role;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        blueprint: true,
        user: userRole === 'ADMIN'
          ? {
              select: {
                id: true,
                name: true,
                email: true,
              },
            }
          : false,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Non-admin users can only see their own payments
    if (userRole !== 'ADMIN' && payment.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ payment });
  } catch (error: unknown) {
    console.error('Fetch payment error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
  }
}
