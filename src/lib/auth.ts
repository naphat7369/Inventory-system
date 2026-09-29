import { cookies } from 'next/headers';
import { SESSION_IDLE_TIMEOUT_SECONDS, signSessionToken, verifySessionToken, type SessionPayload } from './session-token';

export { SESSION_IDLE_TIMEOUT_SECONDS } from './session-token';

export async function createSession(payload: SessionPayload) {
  const session = await signSessionToken(payload);
    
  (await cookies()).set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    priority: 'high',
  });
}

export async function verifySession(session: string | undefined = '') {
  return verifySessionToken(session);
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await verifySession(session);
}

export async function deleteSession() {
  (await cookies()).delete('session');
}
