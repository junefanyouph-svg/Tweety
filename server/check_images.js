const path = require('path')
require('dotenv').config({ path: path.join('c:\\Users\\FYPH\\Tweety', '.env') })
const { createClient } = require('@supabase/supabase-js')

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log('URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING')
  console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING')

  const { data, error } = await s
    .from('posts')
    .select('id, image_url, image_urls')
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.log('ERROR:', JSON.stringify(error))
  } else {
    console.log('POSTS:')
    for (const p of data) {
      console.log('  id=' + p.id + ', image_url=' + (p.image_url ? 'YES' : 'null') + ', image_urls=' + JSON.stringify(p.image_urls))
    }
  }

  // Also try deleting a non-existent post to check RLS
  const { error: delError } = await s
    .from('posts')
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000000')

  console.log('Delete test error:', delError ? JSON.stringify(delError) : 'none (service role can delete)')

  process.exit(0)
}

main().catch(function(e) { console.error(e); process.exit(1) })
