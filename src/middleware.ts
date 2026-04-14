import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  const protectedPaths = ['/admin', '/staff', '/dashboard'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string;

    // Role-based access control
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (pathname.startsWith('/staff') && role !== 'STAFF' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Admin and staff can also access /admin
    if (pathname.startsWith('/dashboard') && (role === 'ADMIN' || role === 'STAFF')) {
      // Allow access, but could redirect to admin/staff if desired
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/dashboard/:path*'],
};
