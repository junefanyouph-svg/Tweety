require('dotenv').config({ path: '../.env' });
const supabase = require('./supabase');

async function test_insert() {
    console.log("Testing fallback insert with type: 'comment_mention'...");
    const { error } = await supabase.from('notifications').insert([{
        recipient_id: 'cb6fa8e9-d419-4dc8-a1bf-fb61fb66da64',
        sender_id: 'cb6fa8e9-d419-4dc8-a1bf-fb61fb66da64',
        sender_username: 'test',
        type: 'comment_mention',
        post_id: '0190cfda-86ed-7ae9-b2be-000000000000'
    }]);

    if (error) {
        console.error("EXPECTED ERROR FOUND ON FALLBACK:", error);
    } else {
        console.log("Fallback insert succeeded.");
    }

    process.exit();
}
test_insert();
