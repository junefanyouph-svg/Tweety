const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET likes for a comment
router.get('/:comment_id', async (req, res) => {
    const { comment_id } = req.params
    const { data, error } = await supabase
        .from('comment_likes')
        .select('*')
        .eq('comment_id', comment_id)

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
})

// LIKE a comment
router.post('/', async (req, res) => {
    const { comment_id, user_id } = req.body

    const { data, error } = await supabase
        .from('comment_likes')
        .insert([{ comment_id, user_id }])
        .select()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
})

// UNLIKE a comment
router.delete('/', async (req, res) => {
    const { comment_id, user_id } = req.body

    const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', comment_id)
        .eq('user_id', user_id)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ message: 'Comment unliked' })
})

module.exports = router
