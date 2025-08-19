'use server';

import { getAuthenticatedContext } from '@/src/lib/auth-helpers';

export async function updateFormRegistry(
  formCode: string,
  values: { expected_version?: string; effective_date?: string | null }
) {
  const { adminClient: supabase, user } = await getAuthenticatedContext();

  // Check if user has broker_admin role
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (membership?.role !== 'broker_admin') {
    throw new Error('Unauthorized: Only broker admins can update the forms registry');
  }

  // Update the forms registry
  const updateData: any = {};
  if (values.expected_version !== undefined) {
    updateData.expected_version = values.expected_version;
  }
  if (values.effective_date !== undefined) {
    updateData.effective_date = values.effective_date;
  }

  const { error } = await supabase
    .from('forms_registry')
    .update(updateData)
    .eq('form_code', formCode);

  if (error) {
    throw new Error(`Failed to update form registry: ${error.message}`);
  }
}

export async function fetchFormsRegistry() {
  const { adminClient: supabase } = await getAuthenticatedContext();

  const { data, error } = await supabase
    .from('forms_registry')
    .select('*')
    .order('form_code');

  if (error) {
    throw new Error(`Failed to fetch forms registry: ${error.message}`);
  }

  return data || [];
}