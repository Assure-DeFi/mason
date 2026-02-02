import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware to handle authentication for both pages and API routes.
 *
 * - API routes (/api/*): Return JSON 401 error for unauthenticated requests
 * - Page routes: Redirect to login page for unauthenticated requests
 *
 * Excluded routes (always allowed):
 * - /api/auth/* - NextAuth authentication endpoints
 * - /api/health - Health check endpoint
 * - /auth/* - Authentication pages (signin, etc.)
 * - / - Landing page
 * - /_next/* - Next.js internals
 * - /favicon.ico, etc. - Static assets
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;

  // Handle unauthenticated requests
  if (!isAuthenticated) {
    // API routes: Return JSON 401 error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 },
      );
    }

    // Page routes: Redirect to login
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

/**
 * Check if a route is public (doesn't require authentication)
 */
function isPublicRoute(pathname: string): boolean {
  // Auth routes must be accessible for login to work
  if (pathname.startsWith('/api/auth')) {
    return true;
  }

  // Health check endpoint should be public
  if (pathname === '/api/health') {
    return true;
  }

  // Authentication pages
  if (pathname.startsWith('/auth/')) {
    return true;
  }

  // Landing page
  if (pathname === '/') {
    return true;
  }

  // Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/site.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico')
  ) {
    return true;
  }

  return false;
}

/**
 * Configure which routes the middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
