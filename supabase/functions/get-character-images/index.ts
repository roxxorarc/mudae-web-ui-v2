import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // body is sent as JSON by supabase.functions.invoke
    const { characterId } = await req.json() as { characterId?: string }

    if (!characterId) {
      return json({ error: 'Missing characterId' }, 400)
    }

    const mudaeUrl = `https://mudae.net/character/${characterId}`
    console.log(`[get-character-images] fetching ${mudaeUrl}`)

    const response = await fetch(mudaeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      console.error(`[get-character-images] mudae.net returned ${response.status}`)
      return json({ images: [], error: `mudae.net ${response.status}` })
    }

    const html = await response.text()
    console.log(`[get-character-images] HTML length: ${html.length}`)
    console.log(`[get-character-images] Final URL (after redirects): ${response.url}`)

    // Dump raw HTML for inspection
    console.log(`[get-character-images] === HTML DUMP (first 3000 chars) ===`)
    console.log(html.slice(0, 3000))
    console.log(`[get-character-images] === HTML DUMP (3000-6000) ===`)
    console.log(html.slice(3000, 6000))

    // Log all id= attributes found in the page
    const allIds = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1])
    console.log(`[get-character-images] All id= found: ${JSON.stringify(allIds)}`)

    // Log all img src found anywhere in the page
    const allImgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1])
    console.log(`[get-character-images] All img src found: ${JSON.stringify(allImgs)}`)

    const images: string[] = []

    // Find the start position of id="images" — avoids nested-tag regex failures
    const sectionStart = html.search(/\bid=["']images["']/i)
    console.log(`[get-character-images] #images position in HTML: ${sectionStart}`)

    if (sectionStart === -1) {
      console.log(`[get-character-images] #images NOT found`)
    } else {
      // Take a large slice starting from the #images attribute.
      // Large enough to capture all images in the section.
      const slice = html.slice(sectionStart, sectionStart + 100_000)
      console.log(`[get-character-images] slice around #images (first 1000): ${slice.slice(0, 1000)}`)

      // Find the opening <ul> inside this slice
      const ulStart = slice.search(/<ul[\s>]/i)
      console.log(`[get-character-images] <ul> position within slice: ${ulStart}`)

      if (ulStart === -1) {
        console.log(`[get-character-images] no <ul> found inside #images slice`)
      } else {
        // Find the closing </ul> — search from ulStart
        const ulClose = slice.indexOf('</ul>', ulStart)
        console.log(`[get-character-images] </ul> position within slice: ${ulClose}`)

        const ulContent = ulClose === -1
          ? slice.slice(ulStart)           // no closing tag — take everything
          : slice.slice(ulStart, ulClose)

        console.log(`[get-character-images] ul content length: ${ulContent.length}`)
        console.log(`[get-character-images] ul content (first 1000): ${ulContent.slice(0, 1000)}`)

        const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*/gi
        let m
        while ((m = imgRe.exec(ulContent)) !== null) {
          const src = m[1]
          const abs = src.startsWith('http') ? src : `https://mudae.net${src}`
          images.push(abs)
        }
      }
    }

    console.log(`[get-character-images] found ${images.length} images: ${JSON.stringify(images)}`)
    return json({ characterId, images, count: images.length })

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
