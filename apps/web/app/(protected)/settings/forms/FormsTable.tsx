'use client';

import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { updateFormRegistry } from '@/src/app/settings/forms/actions';

interface FormRegistryEntry {
  form_code: string;
  expected_version: string;
  effective_date: string | null;
  updated_at: string;
}

interface FormsTableProps {
  forms: FormRegistryEntry[];
  userRole: string;
}

export function FormsTable({ forms, userRole }: FormsTableProps) {
  const [editingForm, setEditingForm] = useState<FormRegistryEntry | null>(null);
  const [formValues, setFormValues] = useState({ expected_version: '', effective_date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isAdmin = userRole === 'broker_admin';

  const handleEdit = (form: FormRegistryEntry) => {
    setEditingForm(form);
    setFormValues({
      expected_version: form.expected_version,
      effective_date: form.effective_date || ''
    });
    setError(null);
  };

  const handleCancel = () => {
    setEditingForm(null);
    setFormValues({ expected_version: '', effective_date: '' });
    setError(null);
  };

  const handleSave = async () => {
    if (!editingForm) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updates: { expected_version?: string; effective_date?: string | null } = {};
      
      if (formValues.expected_version !== editingForm.expected_version) {
        updates.expected_version = formValues.expected_version;
      }
      
      if (formValues.effective_date !== (editingForm.effective_date || '')) {
        updates.effective_date = formValues.effective_date || null;
      }

      if (Object.keys(updates).length > 0) {
        await updateFormRegistry(editingForm.form_code, updates);
        toast({
          title: 'Success',
          description: `Form ${editingForm.form_code} updated successfully`
        });
        
        handleCancel();
        // Reload only in browser environment, not in tests
        if (typeof window !== 'undefined' && typeof window.location.reload === 'function') {
          try {
            window.location.reload();
          } catch (e) {
            // Ignore errors in test environment
            console.log('Reload skipped in test environment');
          }
        }
      } else {
        handleCancel();
      }
    } catch (err) {
      setError('Failed to update form registry');
      console.error('Update failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Forms Registry</CardTitle>
          {!isAdmin && <Badge variant="secondary">Read-only</Badge>}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form Code</TableHead>
                <TableHead>Expected Version</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Last Updated</TableHead>
                {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.form_code}>
                  <TableCell className="font-medium">{form.form_code}</TableCell>
                  <TableCell>{form.expected_version}</TableCell>
                  <TableCell>{formatDate(form.effective_date)}</TableCell>
                  <TableCell>{formatDate(form.updated_at)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(form)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingForm} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingForm?.form_code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expected_version">Expected Version</Label>
              <Input
                id="expected_version"
                value={formValues.expected_version}
                onChange={(e) => setFormValues({ ...formValues, expected_version: e.target.value })}
                placeholder="e.g., 20-18"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                value={formValues.effective_date}
                onChange={(e) => setFormValues({ ...formValues, effective_date: e.target.value })}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}