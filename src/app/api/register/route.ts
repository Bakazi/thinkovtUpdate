import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateWorkflowEmail } from '@/lib/verum-workflow';
import { sendEmailText } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Never trust client-provided roles. Assign role server-side.
    const role = normalizedEmail === 'admin@thinkovr.com' ? 'ADMIN' : 'USER';

    const user = await db.user.create({
      data: {
        name: name || null,
        email: normalizedEmail,
        password: hashedPassword,
        role,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    // Fire-and-forget welcome email (does not block registration success)
    try {
      const { subject, body } = await generateWorkflowEmail({
        state: 'NEW_REGISTRATION',
        userName: user.name || 'Operator',
        dashboardUrl: `${req.nextUrl.origin}/dashboard`,
      });
      await sendEmailText({ to: user.email, subject, body });
    } catch (e) {
      console.error('Registration email failed:', e);
    }

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong during registration' },
      { status: 500 }
    );
  }
}
