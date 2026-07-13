const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testUpload() {
  const buffer = Buffer.from('hello world', 'utf-8');
  const fileName = `test_${Date.now()}.txt`;
  
  const { data, error } = await supabase.storage.from('photos').upload(fileName, buffer, { contentType: 'text/plain' });
  if (error) {
    console.error('Upload failed:', error);
  } else {
    console.log('Upload success:', data);
  }
}

testUpload();
