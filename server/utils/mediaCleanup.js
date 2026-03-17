const supabase = require('../supabase')

const MEDIA_RETENTION_DAYS = 30
const MEDIA_CLEANUP_TABLE = 'media_cleanup_queue'

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function parseStorageUrl(mediaUrl) {
  if (!mediaUrl) return null

  try {
    const { pathname } = new URL(mediaUrl)
    const marker = '/storage/v1/object/public/'
    const markerIndex = pathname.indexOf(marker)
    if (markerIndex === -1) return null

    const storagePath = pathname.slice(markerIndex + marker.length)
    const [bucket, ...objectPathParts] = storagePath.split('/')
    const objectPath = objectPathParts.join('/')

    if (!bucket || !objectPath) return null

    return {
      bucket: decodeURIComponent(bucket),
      objectPath: decodeURIComponent(objectPath)
    }
  } catch {
    return null
  }
}

async function enqueueMediaForDeletion(items) {
  const now = new Date()
  const deleteAfter = addDays(now, MEDIA_RETENTION_DAYS).toISOString()

  const rows = items
    .map(item => {
      const parsed = parseStorageUrl(item.mediaUrl)
      if (!parsed) return null

      return {
        bucket: parsed.bucket,
        object_path: parsed.objectPath,
        media_url: item.mediaUrl,
        source_type: item.sourceType,
        source_id: String(item.sourceId),
        delete_after: deleteAfter,
        created_at: now.toISOString(),
        deleted_at: null,
        last_error: null
      }
    })
    .filter(Boolean)

  if (!rows.length) return { queued: 0 }

  const { error } = await supabase
    .from(MEDIA_CLEANUP_TABLE)
    .upsert(rows, {
      onConflict: 'bucket,object_path',
      ignoreDuplicates: false
    })

  if (error) {
    throw error
  }

  return { queued: rows.length }
}

async function processMediaCleanupBatch(limit = 100) {
  const now = new Date().toISOString()
  const { data: dueItems, error } = await supabase
    .from(MEDIA_CLEANUP_TABLE)
    .select('id, bucket, object_path, media_url')
    .is('deleted_at', null)
    .lte('delete_after', now)
    .order('delete_after', { ascending: true })
    .limit(limit)

  if (error) {
    throw error
  }

  const results = {
    processed: 0,
    deleted: 0,
    failed: 0
  }

  for (const item of dueItems || []) {
    results.processed += 1

    const { error: removeError } = await supabase
      .storage
      .from(item.bucket)
      .remove([item.object_path])

    if (removeError) {
      results.failed += 1
      await supabase
        .from(MEDIA_CLEANUP_TABLE)
        .update({ last_error: removeError.message })
        .eq('id', item.id)
      continue
    }

    results.deleted += 1
    await supabase
      .from(MEDIA_CLEANUP_TABLE)
      .update({
        deleted_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', item.id)
  }

  return results
}

module.exports = {
  MEDIA_RETENTION_DAYS,
  enqueueMediaForDeletion,
  processMediaCleanupBatch
}
