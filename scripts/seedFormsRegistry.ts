import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function seedFormsRegistry() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);

  // Seed the forms registry with initial data
  const { data, error } = await sb.from('forms_registry').upsert([
    { 
      form_code: 'TREC-20', 
      expected_version: '20-18', 
      effective_date: '2025-01-03' 
    },
    { 
      form_code: 'TREC-40-11', 
      expected_version: '40-11', 
      effective_date: null 
    },
    { 
      form_code: 'TREC-36-10', 
      expected_version: '36-10', 
      effective_date: null 
    },
    { 
      form_code: 'TREC-39-10', 
      expected_version: '39-10', 
      effective_date: null 
    }
  ], { 
    onConflict: 'form_code' 
  });

  if (error) {
    console.error('Error seeding forms registry:', error);
    process.exit(1);
  }

  console.log('Forms registry seeded successfully');
  console.log('Seeded forms:', data?.map(f => f.form_code).join(', '));
}

// Run the seed script
seedFormsRegistry().catch(console.error);