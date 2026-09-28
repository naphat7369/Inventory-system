import { NextResponse } from 'next/server';
import { EApproveError } from './errors';

export function eApproveErrorResponse(error: unknown) {
  if (error instanceof EApproveError) {
    return NextResponse.json({ error: error.message, code: error.code, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) }, { status: error.status });
  }
  const validation = error as { code?: string; message?: string; fieldErrors?: unknown };
  if (validation?.code === 'VALIDATION_ERROR') {
    return NextResponse.json({ error: validation.message, code: validation.code, fieldErrors: validation.fieldErrors }, { status: 400 });
  }
  const candidate = error as { code?: string };
  if (candidate?.code === 'P2002') {
    return NextResponse.json({ error: 'ข้อมูลถูกประมวลผลแล้วหรือเกิดการชนกัน กรุณาโหลดข้อมูลใหม่', code: 'CONCURRENT_CONFLICT' }, { status: 409 });
  }
  console.error('E-Approve request failed', error);
  return NextResponse.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 });
}
