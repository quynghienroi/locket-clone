require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const broadcastFeed = require('./broadcastHelper');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const ioMock = {
  emit: (event, data) => {
    console.log(`Mock Emit: ${event}`);
    console.log(`Data length: ${data ? data.length : 0}`);
    if (data && data.length > 0) {
      console.log(data[0]);
    } else {
      console.log('No data!');
    }
  }
};

broadcastFeed(supabase, ioMock);
