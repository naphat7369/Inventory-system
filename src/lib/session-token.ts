import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

const secretKey = process.env.JWT_SECRET || 'super-secret-default-key-change-in-production';
const encodedKey = new TextEncoder().encode(secretKey);

function readIdleTimeoutMinutes() {
  const configured = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? 30);
  return Number.isFinite(configured) ? Math.min(480, Math.max(5, Math.floor(configured))) : 30;
}

export const SESSION_IDLE_TIMEOUT_SECONDS = readIdleTimeoutMinutes() * 60;

export type SessionPayload = JWTPayload & {
  id: string;
  username: string;
  role: string;
  isApprover?: boolean;
  fullName?: string | null;
  department?: string | null;
  departmentId?: string | null;
  phone?: string | null;
};

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_IDLE_TIMEOUT_SECONDS}s`)
    .sign(encodedKey);
}

export async function verifySessionToken(session: string | undefined = '') {
  try {
    if (!session) return null;
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ['HS256'] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
