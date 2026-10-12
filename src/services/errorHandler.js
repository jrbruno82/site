export function handleServiceError(context, error) {
  const message = error && error.message ? error.message : 'Erro inesperado';
  console.error(`[${context}]`, message);
  return {
    ok: false,
    error: message,
    context,
  };
}

export async function safeAsyncRun(context, fn) {
  try {
    return { ok: true, result: await fn() };
  } catch (error) {
    return handleServiceError(context, error);
  }
}
