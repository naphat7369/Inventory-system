import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

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

  const isProtectedPath = path !== '/login';

  if (isProtectedPath) {
    const sessionCookie = request.cookies.get('session')?.value;
    const session = await verifySession(sessionCookie);

    if (!session) {
      const response = NextResponse.redirect(new URL('/login?reason=session-expired', request.url));
      response.cookies.delete('session');
      return response;
    }

    // STAFF can use the borrow portal and Memo/E-Approve pages exposed in their sidebar.
    if (session.role !== 'ADMIN' && !path.startsWith('/borrows') && !path.startsWith('/memos')) {
      return NextResponse.redirect(new URL('/borrows', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
