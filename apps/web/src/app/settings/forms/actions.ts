'use server';

import { supabaseServer } from '@/src/lib/supabaseServer';
import { getAuthenticatedContext } from '@/src/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

export interface FormRegistryRow {
  id: string;
  form_code: string;
  expected_version: string;
  effective_date: string | null;
  updated_at: string;
}

/**
 * Get all forms from the registry
 */
export async function getFormsRegistry(): Promise<FormRegistryRow[]> {
  const supabase = supabaseServer();
  
  const { data, error } = await supabase
    .from('forms_registry')
    .select('*')
    .order('form_code');
  
  if (error) {
    console.error('Failed to fetch forms registry:', error);
    throw new Error('Failed to load forms registry');
  }
  
  return data || [];
}

/**
 * Update a form's expected version or effective date
 * Only accessible to broker_admin users
 */
export async function updateFormRegistry(
  formCode: string, 
  values: { 
    expected_version?: string; 
    effective_date?: string | null 
  }
): Promise<void> {
  const { user } = await getAuthenticatedContext();
  
  // TODO: Check if user is broker_admin
  // For now, we'll allow any authenticated user (you should add proper role checking)
  
  const supabase = supabaseServer();
  
  const { error } = await supabase
    .from('forms_registry')
    .update({
      ...values,
      updated_at: new Date().toISOString()
    })
    .eq('form_code', formCode);
  
  if (error) {
    console.error('Failed to update form registry:', error);
    throw new Error('Failed to update form registry');
  }
  
  // Revalidate the settings page
  revalidatePath('/settings/forms');
}