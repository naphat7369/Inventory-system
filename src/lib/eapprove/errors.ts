export class EApproveError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: unknown;
  constructor(code: string, message: string, status = 400, fieldErrors?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.name = 'EApproveError';
  }
}
