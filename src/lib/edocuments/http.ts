import { NextResponse } from 'next/server';
import { EDocumentsError } from './errors';

export function eDocumentsErrorResponse(error: unknown) {
  if (error instanceof EDocumentsError) {
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
  console.error('E-Documents request failed', error);
  return NextResponse.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 });
}
