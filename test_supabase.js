import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const { data, error } = await supabase.from('companies').insert({
    name: 'Test Company',
    admin_email: 'test@example.com',
    password: 'password123',
  }).select().single();

  console.log('Data:', data);
  console.log('Error:', error);
}

testInsert();
