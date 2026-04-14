import { NextRequest, NextResponse } from 'next/server';
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

    const tiers = await db.paymentTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Parse features JSON strings
    const parsedTiers = tiers.map((tier) => ({
      ...tier,
      features: JSON.parse(tier.features),
    }));

    return NextResponse.json({ tiers: parsedTiers });
  } catch (error: unknown) {
    console.error('Fetch payment tiers error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment tiers' }, { status: 500 });
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
    const { id, name, price, maxBlueprints, features, isActive, slug, sortOrder, currency } = body;

    if (!id) {
      return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 });
    }

    const existingTier = await db.paymentTier.findUnique({ where: { id } });
    if (!existingTier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Build update data with validated fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = String(name);
    if (price !== undefined) updateData.price = Number(price);
    if (maxBlueprints !== undefined) updateData.maxBlueprints = Number(maxBlueprints);
    if (features !== undefined) updateData.features = JSON.stringify(features);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (slug !== undefined) updateData.slug = String(slug);
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (currency !== undefined) updateData.currency = String(currency);

    const updated = await db.paymentTier.update({
      where: { id },
      data: updateData,
    });

    const parsedTier = {
      ...updated,
      features: JSON.parse(updated.features),
    };

    return NextResponse.json({ tier: parsedTier });
  } catch (error: unknown) {
    console.error('Update payment tier error:', error);
    return NextResponse.json({ error: 'Failed to update payment tier' }, { status: 500 });
  }
}
