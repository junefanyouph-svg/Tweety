import { supabase } from './src/supabase.js';

async function checkSchema() {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Data:", data);
        if (data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("No data, try inserting a test message and rollback or check table info.");
            // We can create a dummy insert that fails to get schema info, or just see the error
        }
    }
}

checkSchema();
