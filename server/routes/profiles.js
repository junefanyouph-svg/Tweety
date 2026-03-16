const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// SEARCH users - must be ABOVE /:username
router.get('/search/:query', async (req, res) => {
  const { query } = req.params
  const trimmed = query?.trim()

  if (!trimmed) {
    return res.json([])
  }

  // Split query into words and match each word against username/display_name
  const words = trimmed.split(/\s+/).filter(Boolean)

  const orConditions = words.flatMap(w => ([
    `username.ilike.%${w}%`,
    `display_name.ilike.%${w}%`
  ])).join(',')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(orConditions)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET profile stats in one call
router.get('/stats/:username', async (req, res) => {
  const { username } = req.params

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  const [postsRes, followersRes, followingRes] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', profile.user_id),
    supabase.from('followers').select('id', { count: 'exact' }).eq('following_id', profile.user_id),
    supabase.from('followers').select('id', { count: 'exact' }).eq('follower_id', profile.user_id),
  ])

  res.json({
    profile,
    stats: {
      posts: postsRes.count || 0,
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
    }
  })
})

// CHECK if username is taken
router.get('/check/:username', async (req, res) => {
  const { username } = req.params

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  res.json({ taken: !!data })
})

// GET profile by username
router.get('/:username', async (req, res) => {
  const { username } = req.params

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// CREATE or UPDATE profile
router.post('/', async (req, res) => {
  const { user_id, username, bio } = req.body

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ bio })
      .eq('user_id', user_id)
      .select()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert([{ user_id, username, bio, avatar_url: null, display_name: username }])
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

module.exports = router