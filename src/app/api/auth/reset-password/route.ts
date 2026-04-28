import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

// POST /api/auth/reset-password - Request password reset
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return NextResponse.json({ 
        success: true, 
        message: 'If an account exists, a reset email has been sent.' 
      });
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens
    await db.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    // Create new token
    await db.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expiresAt,
      },
    });

    // Build reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // TODO: Send email with reset link
    // For now, return the URL (in production, send via email)
    console.log(`Password reset link for ${normalizedEmail}: ${resetUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset instructions sent to your email.',
      // Only include resetUrl in development
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
