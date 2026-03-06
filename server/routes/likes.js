const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET likes for a post
router.get('/:post_id', async (req, res) => {
  const { post_id } = req.params
  const { data, error } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', post_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// LIKE a post
router.post('/', async (req, res) => {
  const { post_id, user_id, username } = req.body

  const { data, error } = await supabase
    .from('likes')
    .insert([{ post_id, user_id }])
    .select()

  if (error) return res.status(500).json({ error: error.message })

  // Respond immediately — don't block on notification
  res.json(data)

  // Notify the post owner asynchronously
  try {
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', post_id)
      .single()

    if (post && post.user_id !== user_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          recipient_id: post.user_id,
          sender_id: user_id,
          sender_username: username,
          type: 'like',
          post_id: post_id
        }])
      if (notifError) {
        console.error('Failed to send like notification:', notifError)
      }
    }
  } catch (e) {
    console.error('Error sending like notification:', e)
  }
})

// UNLIKE a post
router.delete('/', async (req, res) => {
  const { post_id, user_id } = req.body

  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('post_id', post_id)
    .eq('user_id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Unliked' })
})

module.exports = router