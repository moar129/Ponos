export function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string') return err;

  if (err && typeof err === 'object') {
    const error = err as {
      data?: { error?: unknown };
      error?: unknown;
      message?: unknown;
    };

    if (typeof error.data?.error === 'string') return error.data.error;
    if (typeof error.error === 'string') return error.error;
    if (typeof error.message === 'string') return error.message;
  }

  return fallback;
}