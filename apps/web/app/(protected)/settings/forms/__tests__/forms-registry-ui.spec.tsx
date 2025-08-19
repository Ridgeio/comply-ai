import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FormsTable } from '../FormsTable';

import { updateFormRegistry } from '@/src/app/settings/forms/actions';

// Mock server action
vi.mock('@/src/app/settings/forms/actions', () => ({
  updateFormRegistry: vi.fn()
}));

// Mock toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('Forms Registry UI', () => {
  const mockFormsData = [
    {
      form_code: 'TREC-20',
      expected_version: '20-18',
      effective_date: '2024-01-01',
      updated_at: '2025-01-17T10:00:00Z'
    },
    {
      form_code: 'TREC-40',
      expected_version: '40-11',
      effective_date: '2024-06-01',
      updated_at: '2025-01-17T10:00:00Z'
    },
    {
      form_code: 'TREC-36',
      expected_version: '36-10',
      effective_date: null,
      updated_at: '2025-01-17T10:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FormsTable Component', () => {
    it('should display all forms in a table', () => {
      render(<FormsTable forms={mockFormsData} userRole="viewer" />);
      
      // Check table headers
      expect(screen.getByText('Form Code')).toBeInTheDocument();
      expect(screen.getByText('Expected Version')).toBeInTheDocument();
      expect(screen.getByText('Effective Date')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      
      // Check form data
      expect(screen.getByText('TREC-20')).toBeInTheDocument();
      expect(screen.getByText('20-18')).toBeInTheDocument();
      // Check that date is displayed (format might vary)
      expect(screen.getByText((content, element) => {
        return element?.tagName?.toLowerCase() === 'td' && 
               content.includes('2024');
      })).toBeInTheDocument();
      
      expect(screen.getByText('TREC-40')).toBeInTheDocument();
      expect(screen.getByText('40-11')).toBeInTheDocument();
      // Check that another date is displayed
      const allDateCells = screen.getAllByText((content, element) => {
        return element?.tagName?.toLowerCase() === 'td' && 
               (content.includes('2024') || content.includes('2025'));
      });
      expect(allDateCells.length).toBeGreaterThanOrEqual(1);
      
      expect(screen.getByText('TREC-36')).toBeInTheDocument();
      expect(screen.getByText('36-10')).toBeInTheDocument();
    });

    it('should show edit buttons for broker_admin role', () => {
      render(<FormsTable forms={mockFormsData} userRole="broker_admin" />);
      
      // Should have edit buttons for each row
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(3);
    });

    it('should not show edit buttons for non-admin roles', () => {
      render(<FormsTable forms={mockFormsData} userRole="viewer" />);
      
      // Should not have any edit buttons
      const editButtons = screen.queryAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(0);
    });

    it('should open edit dialog when edit button clicked', async () => {
      render(<FormsTable forms={mockFormsData} userRole="broker_admin" />);
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]); // Edit TREC-20
      
      // Dialog should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Edit TREC-20')).toBeInTheDocument();
      });
      
      // Should have form fields
      expect(screen.getByLabelText(/expected version/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/effective date/i)).toBeInTheDocument();
    });

    it('should call updateFormRegistry when form submitted', async () => {
      render(<FormsTable forms={mockFormsData} userRole="broker_admin" />);
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]); // Edit TREC-20
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Update version
      const versionInput = screen.getByLabelText(/expected version/i);
      fireEvent.change(versionInput, { target: { value: '20-19' } });
      
      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(updateFormRegistry).toHaveBeenCalledWith('TREC-20', {
          expected_version: '20-19'
        });
      });
    });

    it('should update effective date via dialog', async () => {
      render(<FormsTable forms={mockFormsData} userRole="broker_admin" />);
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[2]); // Edit TREC-36 (has null effective_date)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Set effective date
      const dateInput = screen.getByLabelText(/effective date/i);
      fireEvent.change(dateInput, { target: { value: '2025-01-01' } });
      
      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(updateFormRegistry).toHaveBeenCalledWith('TREC-36', {
          effective_date: '2025-01-01'
        });
      });
    });

    it('should close dialog after successful save', async () => {
      vi.mocked(updateFormRegistry).mockResolvedValueOnce(undefined);
      
      render(<FormsTable forms={mockFormsData} userRole="broker_admin" />);
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const versionInput = screen.getByLabelText(/expected version/i);
      fireEvent.change(versionInput, { target: { value: '20-19' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      // Dialog should close after save
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show error message if save fails', async () => {
      vi.mocked(updateFormRegistry).mockRejectedValueOnce(new Error('Update failed'));
      
      render(<FormsTable forms={mockFormsData} userRole="broker_admin" />);
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const versionInput = screen.getByLabelText(/expected version/i);
      fireEvent.change(versionInput, { target: { value: '20-19' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      // Should show error message - Dialog should remain open with error
      await waitFor(() => {
        // Dialog should remain open
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // Error message should be visible
        expect(screen.getByText('Failed to update form registry')).toBeInTheDocument();
      });
    });

    it('should allow canceling edit dialog', async () => {
      render(<FormsTable forms={mockFormsData} userRole="broker_admin" />);
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      // Dialog should close without calling updateFormRegistry
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      
      expect(updateFormRegistry).not.toHaveBeenCalled();
    });

    it('should display read-only badge for viewer role', () => {
      render(<FormsTable forms={mockFormsData} userRole="viewer" />);
      
      expect(screen.getByText('Read-only')).toBeInTheDocument();
    });

    it('should not display read-only badge for broker_admin', () => {
      render(<FormsTable forms={mockFormsData} userRole="broker_admin" />);
      
      expect(screen.queryByText('Read-only')).not.toBeInTheDocument();
    });
  });
});