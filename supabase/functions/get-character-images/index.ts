import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache TTL: 7 days in milliseconds
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { characterId } = (await req.json()) as { characterId?: string }

    if (!characterId) {
      return json({ error: 'Missing characterId' }, 400)
    }

    // Use service role key for DB access — JWT was already verified by Supabase
    // before reaching this function (verify_jwt = true in config).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // --- Cache read ---
    const { data: cached } = await supabase
      .from('character_images_cache')
      .select('images, cached_at')
      .eq('characterId', characterId)
      .maybeSingle()

    if (cached) {
      const age = Date.now() - new Date(cached.cached_at).getTime()
      if (age < CACHE_TTL_MS) {
        console.log(`[get-character-images] cache hit for ${characterId} (age ${Math.round(age / 3600000)}h)`)
        return json({ characterId, images: cached.images, count: cached.images.length, cached: true })
      }
      console.log(`[get-character-images] cache stale for ${characterId}, re-fetching`)
    } else {
      console.log(`[get-character-images] cache miss for ${characterId}`)
    }

    // --- Fetch from mudae.net ---
    const mudaeUrl = `https://mudae.net/character/${characterId}`
    const response = await fetch(mudaeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      console.error(`[get-character-images] mudae.net returned ${response.status}`)
      // Return stale cache if available rather than an empty response
      if (cached) {
        return json({ characterId, images: cached.images, count: cached.images.length, cached: true, stale: true })
      }
      return json({ images: [], error: `mudae.net ${response.status}` })
    }

    const html = await response.text()
    const images: string[] = []

    const sectionStart = html.search(/\bid=["']images["']/i)
    if (sectionStart !== -1) {
      const slice = html.slice(sectionStart, sectionStart + 100_000)
      const ulStart = slice.search(/<ul[\s>]/i)
      if (ulStart !== -1) {
        const ulClose = slice.indexOf('</ul>', ulStart)
        const ulContent = ulClose === -1 ? slice.slice(ulStart) : slice.slice(ulStart, ulClose)
        const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*/gi
        let m
        while ((m = imgRe.exec(ulContent)) !== null) {
          const src = m[1]
          images.push(src.startsWith('http') ? src : `https://mudae.net${src}`)
        }
      }
    }

    console.log(`[get-character-images] found ${images.length} images for ${characterId}`)

    // --- Cache write (upsert) ---
    if (images.length > 0) {
      await supabase
        .from('character_images_cache')
        .upsert({ characterId, images, cached_at: new Date().toISOString() })
    }

    return json({ characterId, images, count: images.length, cached: false })

  } catch (error) {
    console.error('[get-character-images] error:', error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
