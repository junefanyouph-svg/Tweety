-- Fix foreign key so we can join to profiles
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_id_fkey;

-- Drop and recreate the foreign key pointing to profiles(user_id)
ALTER TABLE reactions ADD CONSTRAINT reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Note: In older supabase schemas, auth.users wasn't easily joinable,
-- or PostgREST needed an explicit fk to profiles for .select('*, profiles(*)') to work.
