const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cldafvdnhsohzuofskqe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZGFmdmRuaHNvaHp1b2Zza3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTAxNjUsImV4cCI6MjA4NzY2NjE2NX0.wr9Y3ogKRHVpQ69IL-1IT00Wko2xaUUpu3bzRs3xQos');

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log(JSON.stringify(data));
  process.exit(0);
}
check();
