import { FormsTable } from './FormsTable';

import { fetchFormsRegistry } from '@/src/app/settings/forms/actions';
import { getAuthenticatedContext } from '@/src/lib/auth-helpers';

export default async function FormsRegistryPage() {
  const { adminClient: supabase, user } = await getAuthenticatedContext();

  // Get user's role
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('role')
    .eq('user_id', user.id)
    .single();

  // Fetch forms registry data
  const forms = await fetchFormsRegistry();

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Forms Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage expected versions for compliance forms. Updates here affect all compliance reports.
          </p>
        </div>
        
        <FormsTable forms={forms} userRole={membership?.role || 'viewer'} />
        
        <div className="mt-6 text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> Changes to expected versions will apply to all future reports. 
            Existing reports will not be affected.
          </p>
        </div>
      </div>
    </div>
  );
}