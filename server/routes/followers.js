const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET followers count of a user
router.get('/:user_id', async (req, res) => {
  const { user_id } = req.params

  const { data, error } = await supabase
    .from('followers')
    .select('*')
    .eq('following_id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET following count of a user
router.get('/following/:user_id', async (req, res) => {
  const { user_id } = req.params

  const { data, error } = await supabase
    .from('followers')
    .select('*')
    .eq('follower_id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// FOLLOW a user
router.post('/', async (req, res) => {
  const { follower_id, following_id } = req.body

  const { data, error } = await supabase
    .from('followers')
    .insert([{ follower_id, following_id }])
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// UNFOLLOW a user
router.delete('/', async (req, res) => {
  const { follower_id, following_id } = req.body

  const { error } = await supabase
    .from('followers')
    .delete()
    .eq('follower_id', follower_id)
    .eq('following_id', following_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Unfollowed' })
})

module.exports = router