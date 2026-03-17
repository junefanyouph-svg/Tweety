const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { enqueueMediaForDeletion } = require('../utils/mediaCleanup')

// GET comments for a post
router.get('/:post_id', async (req, res) => {
  const { post_id } = req.params
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', post_id)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST a comment
router.post('/', async (req, res) => {
  const { post_id, user_id, username, content, image_url, parent_id } = req.body

  const { data, error } = await supabase
    .from('comments')
    .insert([{ post_id, user_id, username, content, image_url, parent_id }])
    .select('*, profiles(display_name, avatar_url)')
    .single()

  if (error) {
    console.error('Database error creating comment:', error)
    return res.status(500).json({ error: error.message })
  }

  // Respond immediately — don't block on notifications
  res.json([data])

  // Send notifications asynchronously (non-blocking)
  if (data) {
    // 1. Notify the post owner that someone commented on their post
    try {
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', post_id)
        .single()

      if (post && post.user_id !== user_id) {
        const { error: commentNotifError } = await supabase
          .from('notifications')
          .insert([{
            recipient_id: post.user_id,
            sender_id: user_id,
            sender_username: username,
            type: 'comment',
            post_id: post_id
          }])
        if (commentNotifError) {
          console.error('Failed to send comment notification to post owner:', commentNotifError)
        }
      }
    } catch (e) {
      console.error('Error sending comment notification to post owner:', e)
    }

    // 2. Send mention notifications for @-tagged users in the comment
    if (content) {
      try {
        const regex = /@([a-zA-Z0-9_]+)/g
        const matches = content.match(regex) || []
        const mentionedUsernames = [...new Set(matches.map(m => m.slice(1)))]

        if (mentionedUsernames.length > 0) {
          // Fetch the post owner id again to avoid duplicate notifications
          const { data: postOwner } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', post_id)
            .single()
          const postOwnerId = postOwner?.user_id

          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id')
            .in('username', mentionedUsernames)

          if (profiles) {
            for (const p of profiles) {
              // Skip: don't notify yourself, and don't double-notify the post owner
              if (p.user_id === user_id) continue
              if (p.user_id === postOwnerId) continue
              const { error: insertError } = await supabase
                .from('notifications')
                .insert([{
                  recipient_id: p.user_id,
                  sender_id: user_id,
                  sender_username: username,
                  type: 'comment_mention',
                  post_id: post_id
                }])
              if (insertError) {
                console.error('Failed to send mention notification:', insertError)
              }
            }
          }
        }
      } catch (e) {
        console.error('Error processing comment mentions:', e)
      }
    }
  }
})

// EDIT a comment
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const { content } = req.body

  let { data, error } = await supabase
    .from('comments')
    .update({ content, edited: true })
    .eq('id', id)
    .select('*, profiles(display_name, avatar_url)')
    .single()

  // Fallback: if 'edited' column doesn't exist yet, retry without it
  if (error && error.message?.includes('edited')) {
    const retry = await supabase
      .from('comments')
      .update({ content })
      .eq('id', id)
      .select('*, profiles(display_name, avatar_url)')
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE a comment
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  const { data: comment, error: commentFetchError } = await supabase
    .from('comments')
    .select('id, image_url')
    .eq('id', id)
    .single()

  if (commentFetchError) return res.status(500).json({ error: commentFetchError.message })

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  if (comment?.image_url) {
    try {
      await enqueueMediaForDeletion([{
        mediaUrl: comment.image_url,
        sourceType: 'comment',
        sourceId: comment.id
      }])
    } catch (queueError) {
      console.error('Failed to queue comment media cleanup:', queueError)
    }
  }
  res.json({ message: 'Comment deleted' })
})

module.exports = router
