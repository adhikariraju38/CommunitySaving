import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth-edge';

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// Routes that require admin role
const adminRoutes = [
  '/admin',
  '/api/admin',
  '/api/users',
  '/api/loans/approve',
  '/api/contributions/record',
];

// Routes that require authentication (member or admin)
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/loans',
  '/savings',
  '/api/profile',
  '/api/loans',
  '/api/contributions',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get token from request
  const token = getTokenFromRequest(request);

  // If no token and route requires auth, redirect to login
  if (!token) {
    const isApiRoute = pathname.startsWith('/api/');
    
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const payload = await verifyToken(token);
  
  if (!payload) {
    const isApiRoute = pathname.startsWith('/api/');
    
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user is approved (except for admins and pending approval routes)
  if (payload.status !== 'approved' && payload.role !== 'admin') {
    const isApiRoute = pathname.startsWith('/api/');
    
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: 'Account pending approval' },
        { status: 403 }
      );
    }

    // Redirect to pending approval page
    const pendingUrl = new URL('/pending-approval', request.url);
    return NextResponse.redirect(pendingUrl);
  }

  // Check admin routes
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  
  if (isAdminRoute && payload.role !== 'admin') {
    const isApiRoute = pathname.startsWith('/api/');
    
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Redirect non-admin users to their dashboard
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Redirect authenticated users away from auth pages
  if (pathname === '/login' || pathname === '/register') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Redirect root to appropriate dashboard
  if (pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
