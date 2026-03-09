const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const supabase = require('./supabase')

const app = express()
app.use(cors())
app.use(express.json())

const postsRouter = require('./routes/posts')
const likesRouter = require('./routes/likes')
const commentsRouter = require('./routes/comments')
const profilesRouter = require('./routes/profiles')
const followersRouter = require('./routes/followers')
const notificationsRouter = require('./routes/notifications')
const settingsRouter = require('./routes/settings')
const commentLikesRouter = require('./routes/comment_likes')

app.use('/posts', postsRouter)
app.use('/likes', likesRouter)
app.use('/replies', commentsRouter)
app.use('/profiles', profilesRouter)
app.use('/followers', followersRouter)
app.use('/notifications', notificationsRouter)
app.use('/settings', settingsRouter)
app.use('/comment_likes', commentLikesRouter)

app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
    if (error) throw error
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message })
  }
})

const PORT = 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})