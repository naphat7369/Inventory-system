import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

// Paths that require authentication
const protectedPaths = ['/assets', '/quantity-assets', '/borrows', '/licenses', '/categories', '/properties', '/settings', '/users', '/'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Exclude static files, api routes, and login page
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path === '/login' ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const isProtectedPath = protectedPaths.some(p => path === p || path.startsWith(`${p}/`));
  
  if (isProtectedPath) {
    const sessionCookie = request.cookies.get('session')?.value;
    const session = await verifySession(sessionCookie);

    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Non-Admin (STAFF) users are strictly restricted to /borrows (Borrow Form Portal)
    if (session.role !== 'ADMIN' && !path.startsWith('/borrows')) {
      return NextResponse.redirect(new URL('/borrows', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
