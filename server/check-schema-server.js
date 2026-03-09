const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    for (const table of ['profiles', 'posts', 'likes', 'comments', 'followers', 'comment_likes']) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Error fetching ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`${table} table columns:`, Object.keys(data[0]));
        } else {
            console.log(`${table} table exists but is empty.`);
        }
    }
    process.exit();
}

checkSchema();
