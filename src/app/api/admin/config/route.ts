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

    // Ensure default config rows exist (Vercel deploys won't run local seed scripts).
    // We always backfill missing keys, but never overwrite existing values.
    const defaults: Array<{ key: string; value: string }> = [
      { key: 'AI_PROVIDER', value: 'AUTO' },
      // Engine prompts/skills
      { key: 'BLUEPRINT_SYSTEM_PROMPT', value: '' },
      { key: 'ENGINE_SKILLS', value: '' },
      { key: 'AUDIT_SYSTEM_PROMPT', value: '' },
      // Gemini (default in AUTO)
      { key: 'GEMINI_API_KEYS', value: '' },
      { key: 'GEMINI_MODEL', value: 'gemini-1.5-flash' },
      // Groq fallback
      { key: 'GROQ_API_KEYS', value: '' },
      { key: 'GROQ_MODEL', value: 'llama-3.3-70b-versatile' },
      // Local fallback
      { key: 'OLLAMA_BASE_URL', value: 'http://localhost:11434' },
      { key: 'OLLAMA_MODEL', value: 'llama3' },
      // Legacy keys (backward compat)
      { key: 'GROQ_API_KEY', value: '' },
      { key: 'MODEL_NAME', value: '' },
      { key: 'PAYMENT_MODE', value: 'SUBSCRIPTION' },
      { key: 'PAYFAST_MERCHANT_ID', value: '' },
      { key: 'PAYFAST_MERCHANT_KEY', value: '' },
      { key: 'PAYFAST_PASSPHRASE', value: '' },
      { key: 'PAYFAST_BASE_URL', value: 'https://sandbox.payfast.co.za' },
      { key: 'BLUEPRINT_PRICE_PER', value: '97' },
      { key: 'PAYPAL_CLIENT_ID', value: '' },
      { key: 'PAYPAL_SECRET', value: '' },
    ];

    await db.aIConfig.createMany({ data: defaults, skipDuplicates: true });

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
