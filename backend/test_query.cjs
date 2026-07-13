require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function test() {
  const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
test();
