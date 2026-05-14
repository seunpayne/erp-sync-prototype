const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tqacwivrwfsdsjdnxblp.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function logDecision() {
  console.log('Logging sync engine prototype decision...');
  
  const { data, error } = await supabase
    .from('decisions')
    .insert({
      made_by: 'The Don',
      decision: 'Sync engine prototype must pass all six scenarios before ERP build begins',
      rationale: 'Sync is the highest-risk technical component. Data loss at client stage is unrecoverable. Prove it here first.',
      affects: ['erp_build', 'clemenza', 'mvp_timeline'],
      reversible: false
    });
  
  if (error) {
    console.error('❌ Failed to log decision:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Decision logged successfully');
  console.log('Inserted rows:', data?.length || 'N/A (check Supabase dashboard)');
}

logDecision();
