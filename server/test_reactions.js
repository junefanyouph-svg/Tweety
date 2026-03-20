const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://cldafvdnhsohzuofskqe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZGFmdmRuaHNvaHp1b2Zza3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTAxNjUsImV4cCI6MjA4NzY2NjE2NX0.wr9Y3ogKRHVpQ69IL-1IT00Wko2xaUUpu3bzRs3xQos');

async function test() {
  const { data, error } = await supabase.from('reactions').select('*, profiles(username, display_name, avatar_url)').limit(2);
  fs.writeFileSync('C:\\Users\\FYPH\\Tweety\\server\\test-reactions-fetch.json', JSON.stringify({ data, error }, null, 2));
  process.exit(0);
}
test();
