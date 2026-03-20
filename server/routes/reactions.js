const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET reactions for a post
router.get('/:post_id', async (req, res) => {
  const { post_id } = req.params
  const { data, error } = await supabase
    .from('reactions')
    .select('*')
    .eq('post_id', post_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// UPSERT a reaction (insert or change emoji)
router.post('/', async (req, res) => {
  const { post_id, user_id, emoji, username } = req.body

  const { data, error } = await supabase
    .from('reactions')
    .upsert(
      { post_id, user_id, emoji },
      { onConflict: 'post_id,user_id' }
    )
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
        console.error('Failed to send reaction notification:', notifError)
      }
    }
  } catch (e) {
    console.error('Error sending reaction notification:', e)
  }
})

// DELETE a reaction (un-react)
router.delete('/', async (req, res) => {
  const { post_id, user_id } = req.body

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('post_id', post_id)
    .eq('user_id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Reaction removed' })
})

module.exports = router
