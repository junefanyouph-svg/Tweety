const path = require('path');
require('dotenv').config({ path: '../.env' });
console.log('CWD:', process.cwd());
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Defined' : 'UNDEFINED');
