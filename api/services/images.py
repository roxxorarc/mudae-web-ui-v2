"""Character image gallery scraper with DB cache.

Checks character_images_cache (7-day TTL); on miss scrapes
https://mudae.net/character/{id} and upserts the cache.
"""

import logging
import re
from datetime import datetime, timedelta, timezone

import httpx

from db import repository as repo

logger = logging.getLogger("api.images")

CACHE_TTL = timedelta(days=7)
MUDAE_CHARACTER_URL = "https://mudae.net/character/{character_id}"

_IMAGES_SECTION_RE = re.compile(r'\bid=["\']images["\']', re.IGNORECASE)
_UL_OPEN_RE = re.compile(r"<ul[\s>]", re.IGNORECASE)
_IMG_SRC_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)


def _extract_images(html: str) -> list[str]:
    section = _IMAGES_SECTION_RE.search(html)
    if not section:
        return []
    section_slice = html[section.start() : section.start() + 100_000]
    ul_open = _UL_OPEN_RE.search(section_slice)
    if not ul_open:
        return []
    ul_close = section_slice.find("</ul>", ul_open.start())
    ul_content = section_slice[ul_open.start() : ul_close if ul_close != -1 else None]
    return [
        src if src.startswith("http") else f"https://mudae.net{src}"
        for src in _IMG_SRC_RE.findall(ul_content)
    ]


async def get_character_images(character_id: int) -> dict:
    cached = await repo.get_images_cache(character_id)
    if cached:
        age = datetime.now(timezone.utc) - cached["cached_at"]
        if age < CACHE_TTL:
            return {
                "characterId": str(character_id),
                "images": cached["images"],
                "count": len(cached["images"]),
                "cached": True,
            }

    url = MUDAE_CHARACTER_URL.format(character_id=character_id)
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "text/html,application/xhtml+xml",
                },
            )
    except httpx.HTTPError as e:
        logger.warning(f"[images] mudae.net fetch failed for {character_id}: {e}")
        response = None

    if response is None or response.status_code != 200:
        # Serve stale cache rather than nothing
        if cached:
            return {
                "characterId": str(character_id),
                "images": cached["images"],
                "count": len(cached["images"]),
                "cached": True,
                "stale": True,
            }
        status = response.status_code if response is not None else "unreachable"
        return {"characterId": str(character_id), "images": [], "count": 0,
                "cached": False, "error": f"mudae.net {status}"}

    images = _extract_images(response.text)
    logger.info(f"[images] found {len(images)} images for {character_id}")

    if images:
        await repo.upsert_images_cache(character_id, images)

    return {
        "characterId": str(character_id),
        "images": images,
        "count": len(images),
        "cached": False,
    }
