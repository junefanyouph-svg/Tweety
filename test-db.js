require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
    console.log('Testing connection to:', process.env.SUPABASE_URL);
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        if (error) {
            console.error('Error connecting to Supabase:', error);
        } else {
            console.log('Successfully connected to Supabase!');
            console.log('Sample data:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
