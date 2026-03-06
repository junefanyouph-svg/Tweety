import { supabase } from './src/supabase.js';

async function checkSchema() {
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Comments Data:", data);
        if (data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        }
    }
}

checkSchema();
