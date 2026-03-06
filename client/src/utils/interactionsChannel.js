import { supabase } from '../supabase'

// Singleton realtime channel used to broadcast "interaction" events (like/comment)
// across all connected clients, without depending on Postgres realtime settings.
//
// Any component can import and send/receive broadcasts via this channel.
export const interactionsChannel = supabase.channel('tweety-interactions')

export function broadcastLike({ sender_id, post_id, user_id, action }) {
  return interactionsChannel.send({
    type: 'broadcast',
    event: 'like',
    payload: {
      sender_id,
      new: action === 'like' ? { post_id, user_id } : null,
      old: action === 'unlike' ? { post_id, user_id } : null,
    },
  })
}

export function broadcastComment({ sender_id, post_id, comment_id, action, parent_id }) {
  return interactionsChannel.send({
    type: 'broadcast',
    event: 'comment',
    payload: {
      sender_id,
      new: action === 'insert' ? { post_id, id: comment_id, parent_id } : null,
      old: action === 'delete' ? { post_id, id: comment_id } : null,
    },
  })
}
export function broadcastCommentLike({ sender_id, comment_id, user_id, action }) {
  return interactionsChannel.send({
    type: 'broadcast',
    event: 'comment_like',
    payload: {
      sender_id,
      new: action === 'like' ? { comment_id, user_id } : null,
      old: action === 'unlike' ? { comment_id, user_id } : null,
    },
  })
}

