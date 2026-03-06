const express = require('express')
const cors = require('cors')
require('dotenv').config({ path: '../.env' })

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

app.use('/posts', postsRouter)
app.use('/likes', likesRouter)
app.use('/comments', commentsRouter)
app.use('/profiles', profilesRouter)
app.use('/followers', followersRouter)
app.use('/notifications', notificationsRouter)
app.use('/settings', settingsRouter)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})