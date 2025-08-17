'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit2, Save, X, AlertCircle } from 'lucide-react';
import { updateFormRegistry } from '@/src/app/settings/forms/actions';
import type { FormRegistryRow } from '@/src/app/settings/forms/actions';

interface FormsTableProps {
  forms: FormRegistryRow[];
  isAdmin: boolean;
}

export function FormsTable({ forms, isAdmin }: FormsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    expected_version: string;
    effective_date: string | null;
  }>({ expected_version: '', effective_date: null });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (form: FormRegistryRow) => {
    setEditingId(form.id);
    setEditValues({
      expected_version: form.expected_version,
      effective_date: form.effective_date
    });
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ expected_version: '', effective_date: null });
    setError(null);
  };

  const handleSave = async (formCode: string) => {
    setSaving(true);
    setError(null);
    
    try {
      await updateFormRegistry(formCode, editValues);
      setEditingId(null);
      // In a real app, you'd refresh the data here
      // Only reload in browser environment, not in tests
      if (typeof window !== 'undefined' && window.location && !window.location.href.includes('jsdom')) {
        window.location.reload();
      }
    } catch (err) {
      setError('Failed to update form registry');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    try {
      return format(new Date(date), 'MMM d, yyyy');
    } catch {
      return date;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forms Registry</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form Code</TableHead>
              <TableHead>Expected Version</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Last Updated</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => {
              const isEditing = editingId === form.id;
              
              return (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.form_code}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editValues.expected_version}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          expected_version: e.target.value
                        })}
                        className="w-32"
                        disabled={saving}
                      />
                    ) : (
                      <span className="font-mono">{form.expected_version}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editValues.effective_date || ''}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          effective_date: e.target.value || null
                        })}
                        placeholder="YYYY-MM-DD"
                        className="w-36"
                        disabled={saving}
                      />
                    ) : (
                      formatDate(form.effective_date)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(form.updated_at), 'MMM d, yyyy')}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSave(form.form_code)}
                            disabled={saving}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(form)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {forms.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No forms registered yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}