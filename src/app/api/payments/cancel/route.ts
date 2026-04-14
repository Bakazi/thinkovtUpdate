import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // PayFast cancel_url handler — redirect user to dashboard with cancel message
  const url = new URL(req.url);
  const origin = url.origin;

  return NextResponse.redirect(`${origin}/payment/cancel`);
}
