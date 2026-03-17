const express = require('express')
const router = express.Router()
const { processMediaCleanupBatch } = require('../utils/mediaCleanup')

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  const authHeader = req.headers.authorization || ''
  return authHeader === `Bearer ${secret}`
}

router.get('/media-cleanup', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const results = await processMediaCleanupBatch()
    res.json({ ok: true, ...results })
  } catch (error) {
    console.error('Media cleanup failed:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
