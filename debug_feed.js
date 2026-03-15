const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Post Count ---');
    const { count, error: countErr } = await supabase.from('posts').select('*', { count: 'exact', head: true });
    console.log('Posts count:', count, 'Error:', countErr);

    console.log('--- View check ---');
    const { data, error: viewErr } = await supabase.from('posts_with_user_likes').select('*').limit(1);
    console.log('View data:', data ? 'found' : 'missing', 'Error:', viewErr);

    if (viewErr) {
        console.log('Fallback attempt with posts:');
        const { data: fallback } = await supabase.from('posts').select('*, profiles(username, display_name, avatar_url)').order('created_at', { ascending: false }).limit(5);
        console.log('Fallback data count:', fallback ? fallback.length : 0);
    }
}
check();
