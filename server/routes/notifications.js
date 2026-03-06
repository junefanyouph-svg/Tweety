const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET notifications for a user
router.get('/:user_id', async (req, res) => {
  const { user_id } = req.params

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user_id)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// CREATE a notification
router.post('/', async (req, res) => {
  const { recipient_id, sender_id, sender_username, type, post_id, comment_id } = req.body

  // Don't notify yourself
  if (recipient_id === sender_id) return res.json({ message: 'Skipped' })

  const { data, error } = await supabase
    .from('notifications')
    .insert([{ recipient_id, sender_id, sender_username, type, post_id, comment_id }])
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// MARK all as read
router.patch('/read/:user_id', async (req, res) => {
  const { user_id } = req.params

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Marked as read' })
})

// DELETE a notification
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Deleted' })
})

module.exports = router