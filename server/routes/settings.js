const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { enqueueMediaForDeletion } = require('../utils/mediaCleanup')

// UPDATE username (only if not taken)
router.patch('/username', async (req, res) => {
  const { user_id, username } = req.body

  // Check if username is taken
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) return res.status(400).json({ error: 'Username is already taken!' })

  const { error: authError } = await supabase.auth.admin.updateUserById(user_id, {
    user_metadata: { username }
  })

  if (authError) return res.status(500).json({ error: authError.message })

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ username })
    .eq('user_id', user_id)

  if (profileError) return res.status(500).json({ error: profileError.message })

  await supabase.from('posts').update({ username }).eq('user_id', user_id)
  await supabase.from('comments').update({ username }).eq('user_id', user_id)

  res.json({ message: 'Username updated' })
})

// UPDATE display name
router.patch('/displayname', async (req, res) => {
  const { user_id, display_name } = req.body

  const { error } = await supabase
    .from('profiles')
    .update({ display_name })
    .eq('user_id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Display name updated' })
})

// UPDATE email
router.patch('/email', async (req, res) => {
  const { user_id, email } = req.body

  const { error } = await supabase.auth.admin.updateUserById(user_id, { email })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Email updated' })
})

// GET email for a given user_id (used for username login)
router.get('/email/:user_id', async (req, res) => {
  const { user_id } = req.params

  const { data, error } = await supabase.auth.admin.getUserById(user_id)
  if (error) return res.status(500).json({ error: error.message })

  if (!data || !data.user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ email: data.user.email })
})

// UPDATE password
router.patch('/password', async (req, res) => {
  const { user_id, password } = req.body

  const { error } = await supabase.auth.admin.updateUserById(user_id, { password })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Password updated' })
})

// DELETE account
router.delete('/account', async (req, res) => {
  const { user_id } = req.body

  const [{ data: userPosts }, { data: userComments }] = await Promise.all([
    supabase.from('posts').select('id, image_url').eq('user_id', user_id),
    supabase.from('comments').select('id, image_url').eq('user_id', user_id)
  ])

  const postIds = (userPosts || []).map(post => post.id)
  const { data: commentsOnUserPosts } = postIds.length
    ? await supabase.from('comments').select('id, image_url').in('post_id', postIds)
    : { data: [] }

  const mediaToQueue = [
    ...(userPosts || [])
      .filter(post => post.image_url)
      .map(post => ({ mediaUrl: post.image_url, sourceType: 'post', sourceId: post.id })),
    ...(userComments || [])
      .filter(comment => comment.image_url)
      .map(comment => ({ mediaUrl: comment.image_url, sourceType: 'comment', sourceId: comment.id })),
    ...(commentsOnUserPosts || [])
      .filter(comment => comment.image_url)
      .map(comment => ({ mediaUrl: comment.image_url, sourceType: 'comment', sourceId: comment.id }))
  ]

  await supabase.from('posts').delete().eq('user_id', user_id)
  await supabase.from('comments').delete().eq('user_id', user_id)
  await supabase.from('likes').delete().eq('user_id', user_id)
  await supabase.from('followers').delete().eq('follower_id', user_id)
  await supabase.from('followers').delete().eq('following_id', user_id)
  await supabase.from('profiles').delete().eq('user_id', user_id)
  await supabase.from('notifications').delete().eq('recipient_id', user_id)
  await supabase.from('notifications').delete().eq('sender_id', user_id)

  const { error } = await supabase.auth.admin.deleteUser(user_id)
  if (error) return res.status(500).json({ error: error.message })

  if (mediaToQueue.length) {
    try {
      await enqueueMediaForDeletion(mediaToQueue)
    } catch (queueError) {
      console.error('Failed to queue account media cleanup:', queueError)
    }
  }

  res.json({ message: 'Account deleted' })
})

module.exports = router
