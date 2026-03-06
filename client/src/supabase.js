import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cldafvdnhsohzuofskqe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZGFmdmRuaHNvaHp1b2Zza3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTAxNjUsImV4cCI6MjA4NzY2NjE2NX0.wr9Y3ogKRHVpQ69IL-1IT00Wko2xaUUpu3bzRs3xQos'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)