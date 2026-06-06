// Test script to verify Supabase connection and tables
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...');
  console.log('=====================================');
  
  try {
    // Test basic connection
    console.log('1️⃣ Testing basic connection...');
    const { data, error } = await supabase.from('workspaces').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.log('\n📋 Make sure you have:');
      console.log('- Created the tables using DATABASE_SCHEMA.sql');
      console.log('- Run the SQL commands in Supabase SQL Editor');
      return;
    }
    
    console.log('✅ Connection successful!');
    
    // Test tables
    console.log('\n2️⃣ Testing table access...');
    
    const tables = [
      { name: 'workspaces', description: 'User workspaces' },
      { name: 'business_profiles', description: 'Business information' },
      { name: 'voices', description: 'Retell AI voices' },
      { name: 'retell_llms', description: 'AI LLM configurations' }
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table.name}: ${error.message}`);
        } else {
          console.log(`✅ ${table.name}: ${data?.length || 0} records`);
        }
      } catch (err) {
        console.log(`❌ ${table.name}: ${err.message}`);
      }
    }
    
    // Test sample LLMs
    console.log('\n3️⃣ Testing sample LLMs...');
    try {
      const { data: llms, error: llmError } = await supabase
        .from('retell_llms')
        .select('id, name, industry, is_public');
      
      if (llmError) {
        console.log('❌ LLMs table error:', llmError.message);
      } else if (llms && llms.length > 0) {
        console.log('✅ Sample LLMs found:');
        llms.forEach(llm => {
          console.log(`  - ${llm.name} (${llm.industry}) - ${llm.is_public ? 'Public' : 'Private'}`);
        });
      } else {
        console.log('⚠️  No LLMs found. You may need to run the sample data SQL.');
      }
    } catch (err) {
      console.log('❌ LLM test error:', err.message);
    }
    
    console.log('\n🎉 Supabase setup verification complete!');
    console.log('\n📋 Next steps:');
    console.log('1. If tables are missing, run DATABASE_SCHEMA.sql in Supabase SQL Editor');
    console.log('2. If no sample data, check the INSERT statements in the SQL file');
    console.log('3. Your React app should now work with the database!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testConnection();
