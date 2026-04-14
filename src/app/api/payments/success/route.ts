import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // PayFast return_url handler — redirect user to dashboard with success message
  const url = new URL(req.url);
  const origin = url.origin;

  return NextResponse.redirect(`${origin}/payment/success`);
}
