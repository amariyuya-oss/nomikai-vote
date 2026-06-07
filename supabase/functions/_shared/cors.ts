const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin =
    allowedOrigin === '*'
      ? '*'
      : requestOrigin === allowedOrigin
      ? allowedOrigin
      : ''
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
