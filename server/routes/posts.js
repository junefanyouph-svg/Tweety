const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { enqueueMediaForDeletion } = require('../utils/mediaCleanup')

// SEARCH posts - must be ABOVE /:id
router.get('/search/:query', async (req, res) => {
  const { query } = req.params
  const trimmed = query?.trim()

  if (!trimmed) {
    return res.json([])
  }

  // Split query into individual words for smarter partial matching
  const words = trimmed.split(/\s+/).filter(Boolean)

  // First find user_ids that match the display_name (using the full query for now)
  const { data: matchingProfiles } = await supabase
    .from('profiles')
    .select('user_id')
    .ilike('display_name', `%${trimmed}%`)

  const matchingUserIds = matchingProfiles?.map(p => p.user_id) || []

  // Build OR conditions for each word against content and username
  const contentConditions = words.map(w => `content.ilike.%${w}%`)
  const usernameConditions = words.map(w => `username.ilike.%${w}%`)

  let orConditions = [...contentConditions, ...usernameConditions]

  if (matchingUserIds.length > 0) {
    orConditions.push(`user_id.in.(${matchingUserIds.join(',')})`)
  }

  let supabaseQuery = supabase
    .from('posts')
    .select('*, profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .or(orConditions.join(','))

  const { data, error } = await supabaseQuery

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET all posts
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST a new post
router.post('/', async (req, res) => {
  const { content, username, user_id, image_url, image_urls, mentions, youtube_data } = req.body

  // Build insert object - only include youtube_data if provided
  const insertData = { content, username, user_id, image_url }
  if (Array.isArray(image_urls) && image_urls.length > 0) {
    insertData.image_urls = image_urls
  }
  if (youtube_data) {
    insertData.youtube_data = youtube_data
  }

  const { data, error } = await supabase
    .from('posts')
    .insert([insertData])
    .select('*, profiles(display_name, avatar_url)')

  // Combined mention notification logic
  const notifyMentions = async (postId, currentContent, clientMentions, currentUserId, currentUsername) => {
    // Extract mentions from content: @username
    const regex = /@([a-zA-Z0-9_]+)/g
    const matches = currentContent.match(regex) || []
    const mentionedUsernames = [...new Set(matches.map(m => m.slice(1)))] // unique usernames

    let allMentionedUserIds = Array.isArray(clientMentions) ? [...clientMentions] : []

    // Fetch user IDs for extracted usernames
    if (mentionedUsernames.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .in('username', mentionedUsernames)

      if (profiles) {
        profiles.forEach(p => {
          if (!allMentionedUserIds.includes(p.user_id)) {
            allMentionedUserIds.push(p.user_id)
          }
        })
      }
    }

    if (allMentionedUserIds.length > 0) {
      const notificationPromises = allMentionedUserIds.map(async (mentionedUserId) => {
        if (mentionedUserId === currentUserId) return
        await supabase
          .from('notifications')
          .insert([{
            recipient_id: mentionedUserId,
            sender_id: currentUserId,
            sender_username: currentUsername,
            type: 'mention',
            post_id: postId
          }])
      })
      await Promise.all(notificationPromises)
    }
  }

  if (error) {
    console.error('Database error creating post:', error)
    // Retry without columns that may not exist yet.
    if (error.message?.includes('youtube_data') || error.message?.includes('image_urls')) {
      if (error.message?.includes('youtube_data')) {
        delete insertData.youtube_data
      }
      if (error.message?.includes('image_urls')) {
        delete insertData.image_urls
      }
      const { data: retryData, error: retryError } = await supabase
        .from('posts')
        .insert([insertData])
        .select('*, profiles(display_name, avatar_url)')

      if (retryError) {
        console.error('Database error on post retry:', retryError)
        return res.status(500).json({ error: retryError.message })
      }

      if (retryData?.[0]) {
        await notifyMentions(retryData[0].id, content, mentions, user_id, username)
      }
      return res.json(retryData)
    }
    return res.status(500).json({ error: error.message })
  }

  if (data?.[0]) {
    await notifyMentions(data[0].id, content, mentions, user_id, username)
  }

  res.json(data)
})

// GET single post
router.get('/single/:id', async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(display_name, avatar_url)')
    .eq('id', id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// EDIT a post
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const { content } = req.body

  let { data, error } = await supabase
    .from('posts')
    .update({ content, edited: true })
    .eq('id', id)
    .select()
    .single()

  // Fallback: if 'edited' column doesn't exist yet, retry without it
  if (error && error.message?.includes('edited')) {
    const retry = await supabase
      .from('posts')
      .update({ content })
      .eq('id', id)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE a post
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  const { data: post, error: postFetchError } = await supabase
    .from('posts')
    .select('id, image_url, image_urls')
    .eq('id', id)
    .single()

  if (postFetchError) return res.status(500).json({ error: postFetchError.message })

  const { data: comments, error: commentsFetchError } = await supabase
    .from('comments')
    .select('id, image_url')
    .eq('post_id', id)

  if (commentsFetchError) return res.status(500).json({ error: commentsFetchError.message })

  const mediaToQueue = [
    ...[...(post?.image_urls || []), post?.image_url]
      .filter(Boolean)
      .map(mediaUrl => ({ mediaUrl, sourceType: 'post', sourceId: post.id })),
    ...(comments || [])
      .filter(comment => comment.image_url)
      .map(comment => ({
        mediaUrl: comment.image_url,
        sourceType: 'comment',
        sourceId: comment.id
      }))
  ].filter(Boolean)

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  if (mediaToQueue.length) {
    try {
      await enqueueMediaForDeletion(mediaToQueue)
    } catch (queueError) {
      console.error('Failed to queue post media cleanup:', queueError)
    }
  }
  res.json({ message: 'Post deleted' })
})

module.exports = router
