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
const internalRouter = require('./routes/internal')

const apiRouter = express.Router()
apiRouter.use('/posts', postsRouter)
apiRouter.use('/likes', likesRouter)
apiRouter.use('/replies', commentsRouter)
apiRouter.use('/profiles', profilesRouter)
apiRouter.use('/followers', followersRouter)
apiRouter.use('/notifications', notificationsRouter)
apiRouter.use('/settings', settingsRouter)
apiRouter.use('/comment_likes', commentLikesRouter)
apiRouter.use('/internal', internalRouter)
apiRouter.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
    if (error) throw error
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message })
  }
})

app.use('/api', apiRouter)
app.use('/', apiRouter) // Fallback for local dev or direct calls

const PORT = process.env.PORT || 3001
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)
  })
}

module.exports = app
