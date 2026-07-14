import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

// Paths that require authentication
const protectedPaths = ['/assets', '/licenses', '/categories', '/properties', '/settings', '/users', '/'];

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
    
    // Admins only for settings, users, categories, properties
    const adminOnlyPaths = ['/users', '/settings', '/categories', '/properties'];
    if (adminOnlyPaths.some(p => path.startsWith(p)) && session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/assets', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
