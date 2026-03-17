const MEDIA_CACHE_NAME = 'tweety-media-v1'

const objectUrlMap = new Map()

async function getCache() {
  if (!('caches' in window)) return null
  return caches.open(MEDIA_CACHE_NAME)
}

export async function getCachedMediaObjectUrl(url) {
  if (!url || typeof window === 'undefined') return null
  if (objectUrlMap.has(url)) return objectUrlMap.get(url)

  try {
    const cache = await getCache()
    if (!cache) return null

    let response = await cache.match(url)
    if (!response) {
      response = await fetch(url, { mode: 'cors' })
      if (!response.ok) return null
      await cache.put(url, response.clone())
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    objectUrlMap.set(url, objectUrl)
    return objectUrl
  } catch (error) {
    console.error('Media cache fetch failed:', error)
    return null
  }
}

export async function removeCachedMedia(urls) {
  if (typeof window === 'undefined') return
  const list = Array.isArray(urls) ? urls : [urls]
  const cache = await getCache()

  for (const url of list.filter(Boolean)) {
    if (cache) {
      await cache.delete(url)
    }

    const objectUrl = objectUrlMap.get(url)
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrlMap.delete(url)
    }
  }
}
