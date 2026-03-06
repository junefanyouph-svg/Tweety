require('dotenv').config({ path: '../.env' });
const { supabase } = require('./supabase');

async function run() {
    console.log("Checking notifications schema...");
    const { data, error } = await supabase.from('notifications').select('*').limit(1);
    if (error) {
        console.log("Cols error:", error);
    } else {
        console.log("Cols:", Object.keys(data[0] || {}));
    }

    console.log("\nAttempting to insert a dummy comment tag...");
    const { error: insertErr } = await supabase.from('notifications').insert([{
        recipient_id: 'cb6fa8e9-d419-4dc8-a1bf-fb61fb66da64',  // dummy uuid
        sender_id: 'cb6fa8e9-d419-4dc8-a1bf-fb61fb66da64',
        sender_username: 'test',
        type: 'comment_mention',
        post_id: '0190cfda-86ed-7ae9-b2be-000000000000', // dummy uuid format
        comment_id: 123
    }]);
    console.log("Insert stringified error object:", JSON.stringify(insertErr));
    console.log("Insert result (with comment_id):", insertErr?.message);

    console.log("\nTesting Realtime global channel...");
    const channel = supabase
        .channel('global-interactions-test')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
            console.log('REALTIME LIKE:', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
            console.log('REALTIME COMMENT:', payload);
        })
        .subscribe((status) => {
            console.log('Channel status:', status);
            setTimeout(() => process.exit(), 3000);
        });
}

run();
