require('dotenv').config({ path: '../.env' });
const supabase = require('./supabase');

async function run() {
    console.log("Checking profiles schema...");
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.log("Cols error:", error);
    } else {
        console.log("Cols:", Object.keys(data[0] || {}));
        console.log("Sample Profile:", data[0]);
    }
    process.exit();
}

run();
