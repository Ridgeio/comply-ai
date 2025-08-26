import { createServiceClient } from './supabaseTest'

async function deleteTestProperty() {
  const supabase = createServiceClient();
  
  console.log('Deleting "Test Property at 456 Elm Street"...\n');
  
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', '60f6871a-38a0-4d35-ab54-f71d892656ba');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('✓ Deleted test transaction');
}

deleteTestProperty().catch(console.error);