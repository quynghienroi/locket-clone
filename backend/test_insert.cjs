const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testInsert() {
  const username = 'testuser_' + Date.now();
  
  // Create user first since sender is a foreign key
  await supabase.from('users').insert([{
    username,
    email: `${username}@test.com`,
    password: '123'
  }]);

  const { data: newPhotoDoc, error: insertError } = await supabase.from('photos').insert([{
    sender: username,
    targets: ['ALL'],
    photo_url: 'https://test.com/photo.jpg',
    caption: 'test',
    filter: 'none',
    reactions: {}
  }]).select().single();
  
  if (insertError) {
    console.error('Insert failed:', insertError);
  } else {
    console.log('Insert success:', newPhotoDoc);
  }
}

testInsert();
