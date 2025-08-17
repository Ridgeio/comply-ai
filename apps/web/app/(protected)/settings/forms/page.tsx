import { getFormsRegistry } from '@/src/app/settings/forms/actions';
import { getAuthenticatedContext } from '@/src/lib/auth-helpers';
import { FormsTable } from './FormsTable';

export default async function FormsRegistryPage() {
  // Get current user to check if they're admin
  const { user } = await getAuthenticatedContext();
  
  // TODO: Check if user has broker_admin role
  // For now, we'll allow editing for all authenticated users
  const isAdmin = true; // Replace with actual role check
  
  // Load forms from database
  const forms = await getFormsRegistry();
  
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Forms Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage expected versions for compliance forms. Updates here affect all compliance reports.
          </p>
        </div>
        
        <FormsTable forms={forms} isAdmin={isAdmin} />
        
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