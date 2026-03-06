// Test realtime with ANON key (same as the client uses)
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZGFmdmRuaHNvaHp1b2Zza3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTAxNjUsImV4cCI6MjA4NzY2NjE2NX0.wr9Y3ogKRHVpQ69IL-1IT00Wko2xaUUpu3bzRs3xQos'
const supabaseUrl = 'https://cldafvdnhsohzuofskqe.supabase.co'

// Client (anon key)
const anonClient = createClient(supabaseUrl, anonKey)
// Admin (service key) - for test inserts
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
    console.log('=== Testing Realtime with ANON key (client-side simulation) ===\n')

    const { data: posts } = await adminClient.from('posts').select('id, user_id').limit(1)
    const { data: profiles } = await adminClient
        .from('profiles')
        .select('user_id')
        .neq('user_id', posts[0].user_id)
        .limit(1)

    const testPostId = posts[0].id
    const testUserId = profiles[0].user_id

    let anonEventReceived = false

    // Subscribe using ANON key (like the browser client does)
    const anonChannel = anonClient
        .channel('anon-test-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
            console.log('✅ [ANON] LIKES event received:', payload.eventType)
            anonEventReceived = true
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
            console.log('✅ [ANON] COMMENTS event received:', payload.eventType)
        })
        .subscribe((status) => {
            console.log('[ANON channel] Status:', status)

            if (status === 'SUBSCRIBED') {
                console.log('[ANON channel] Connected! Now inserting a test like using admin key...\n')

                // Use admin key to insert (bypasses RLS)
                setTimeout(async () => {
                    await adminClient.from('likes').delete().eq('post_id', testPostId).eq('user_id', testUserId)
                    const { error } = await adminClient.from('likes').insert([{ post_id: testPostId, user_id: testUserId }])
                    if (error) console.log('Insert error:', error.message)
                    else console.log('Test like inserted (via admin). Waiting for anon channel event...')

                    setTimeout(async () => {
                        await adminClient.from('likes').delete().eq('post_id', testPostId).eq('user_id', testUserId)
                        console.log('Test like cleaned up.')
                    }, 3000)
                }, 1000)
            }
        })

    setTimeout(() => {
        console.log('\n=== DIAGNOSIS ===')
        if (anonEventReceived) {
            console.log('✅ Realtime works with ANON key too. RLS is NOT blocking.')
            console.log('The issue must be in the React component logic or event dispatching.')
        } else {
            console.log('❌ Realtime does NOT work with ANON key!')
            console.log('RLS is blocking realtime events for the anon/authenticated role.')
            console.log('')
            console.log('FIX: Add a SELECT RLS policy for likes and comments tables.')
            console.log('Run this SQL in Supabase SQL Editor:')
            console.log('')
            console.log('  -- Allow all authenticated users to see likes (needed for realtime)')
            console.log('  CREATE POLICY "Allow select likes" ON likes FOR SELECT USING (true);')
            console.log('  CREATE POLICY "Allow select comments" ON comments FOR SELECT USING (true);')
            console.log('')
            console.log('  -- Or if RLS is not needed, disable it:')
            console.log('  ALTER TABLE likes DISABLE ROW LEVEL SECURITY;')
            console.log('  ALTER TABLE comments DISABLE ROW LEVEL SECURITY;')
        }
        anonClient.removeChannel(anonChannel)
        process.exit(0)
    }, 8000)
}

check()
