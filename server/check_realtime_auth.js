const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cldafvdnhsohzuofskqe.supabase.co'
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZGFmdmRuaHNvaHp1b2Zza3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTAxNjUsImV4cCI6MjA4NzY2NjE2NX0.wr9Y3ogKRHVpQ69IL-1IT00Wko2xaUUpu3bzRs3xQos'

const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const client = createClient(supabaseUrl, anonKey)

async function runTest() {
    console.log('Logging in as test user...')

    // Create a fast temporary user to receive events
    const testEmail = 'realtime_test_' + Date.now() + '@example.com'
    const { data: signUpData } = await client.auth.signUp({
        email: testEmail,
        password: 'password123',
        options: { data: { username: 'realtime_tester' } }
    })

    console.log('Receiver logged in with:', signUpData.user ? signUpData.user.email : 'Unknown')

    const channel = client.channel(`test-auth-channel-${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, payload => {
            console.log('🔥 [AUTH CLIENT] RECEIVED COMMENT EVENT:', payload.eventType)
        })
        .subscribe(status => {
            console.log('[AUTH CLIENT] Channel status:', status)

            if (status === 'SUBSCRIBED') {
                setTimeout(async () => {
                    console.log('Inserting a comment via Admin key...')
                    const { data: posts } = await adminClient.from('posts').select('id, user_id, username').limit(1)
                    if (posts && posts.length > 0) {
                        const res = await adminClient.from('comments').insert({
                            post_id: posts[0].id,
                            content: 'TEST COMMENT FROM NODE',
                            user_id: posts[0].user_id, // Use the post author as the comment author to pass FK
                            username: posts[0].username
                        })
                        if (res.error) console.log('Insert error:', res.error)
                        else console.log('Successfully inserted via admin key. Did AUTH CLIENT receive it?')
                    } else {
                        console.log('No posts found to comment on.')
                    }
                }, 1500)
            }
        })

    setTimeout(() => {
        console.log('Test finished. Exiting...')
        process.exit(0)
    }, 6000)
}

runTest()
