const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ping() {
    console.log('Using URL:', process.env.SUPABASE_URL);
    const start = Date.now();
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.log('Error:', error.message);
        } else {
            console.log('Success! Time taken:', Date.now() - start, 'ms');
        }
    } catch (err) {
        console.log('Crash:', err.message);
    }
    process.exit();
}

ping();
