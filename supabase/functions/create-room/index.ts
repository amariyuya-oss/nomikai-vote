import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: '' } }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const body = await req.json().catch(() => ({}))
  const { name, event_at, location, nearest_station } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
    return new Response(
      JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: '入力値が不正です' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  if (!event_at || isNaN(Date.parse(event_at))) {
    return new Response(
      JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: '入力値が不正です' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const participant_token = crypto.randomUUID()
  const admin_token = crypto.randomUUID()
  const expires_at = new Date(new Date(event_at).getTime() + 24 * 60 * 60 * 1000).toISOString()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error } = await supabase.from('rooms').insert({
    name: name.trim(),
    event_at,
    location: location || null,
    nearest_station: nearest_station || null,
    participant_token,
    admin_token,
    expires_at,
  })

  if (error) {
    console.error('DB error:', error)
    return new Response(
      JSON.stringify({ error: { code: 'DB_ERROR', message: 'サーバーエラーが発生しました' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ participant_token, admin_token, expires_at }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
