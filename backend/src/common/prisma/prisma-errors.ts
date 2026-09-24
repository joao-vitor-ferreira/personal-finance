interface PrismaErrorLike {
  code?: unknown;
}

export function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaErrorLike).code === code
  );
}

export function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaErrorWithCode(error, 'P2002');
}
