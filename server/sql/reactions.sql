-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('❤️', '😂', '🤬', '😮', '💔')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Policies: anyone can read, authenticated users can insert/update/delete their own
CREATE POLICY "Anyone can read reactions"
  ON reactions FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reactions"
  ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
  ON reactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON reactions FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups by post
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);

-- Migrate existing likes to reactions as ❤️ (idempotent — skips duplicates)
-- Only migrate likes whose post still exists to avoid FK violations from orphaned rows
INSERT INTO reactions (post_id, user_id, emoji, created_at)
SELECT l.post_id, l.user_id, '❤️', l.created_at
FROM likes l
WHERE EXISTS (SELECT 1 FROM posts p WHERE p.id = l.post_id)
ON CONFLICT (post_id, user_id) DO NOTHING;
