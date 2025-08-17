import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormsTable } from '../FormsTable';
import { updateFormRegistry } from '@/src/app/settings/forms/actions';

// Mock the server action
vi.mock('@/src/app/settings/forms/actions', () => ({
  updateFormRegistry: vi.fn()
}));

describe('Forms Registry UI', () => {
  const mockForms = [
    {
      id: '1',
      form_code: 'TREC-20',
      expected_version: '20-18',
      effective_date: '2025-01-03',
      updated_at: '2025-01-01T00:00:00Z'
    },
    {
      id: '2',
      form_code: 'TREC-40-11',
      expected_version: '40-11',
      effective_date: null,
      updated_at: '2025-01-01T00:00:00Z'
    }
  ];

  describe('display mode', () => {
    it('should render forms registry table', () => {
      render(<FormsTable forms={mockForms} isAdmin={false} />);
      
      expect(screen.getByText('TREC-20')).toBeInTheDocument();
      expect(screen.getByText('20-18')).toBeInTheDocument();
      expect(screen.getByText('TREC-40-11')).toBeInTheDocument();
      expect(screen.getByText('40-11')).toBeInTheDocument();
    });

    it('should display effective dates', () => {
      render(<FormsTable forms={mockForms} isAdmin={false} />);
      
      // Check that dates are displayed (exact format may vary)
      const dateCells = screen.getAllByText((content, element) => {
        return element?.tagName.toLowerCase() === 'td' && 
               (content.includes('2025') || content === 'Not set');
      });
      expect(dateCells.length).toBeGreaterThan(0);
      expect(dateCells[0]).toBeInTheDocument();
    });

    it('should not show edit buttons for non-admin', () => {
      render(<FormsTable forms={mockForms} isAdmin={false} />);
      
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  describe('edit mode (broker_admin)', () => {
    it('should show edit buttons for admin', () => {
      render(<FormsTable forms={mockForms} isAdmin={true} />);
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(mockForms.length);
    });

    it('should enable inline editing on edit click', async () => {
      render(<FormsTable forms={mockForms} isAdmin={true} />);
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      
      // Should show input fields - check by role instead of value
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
      
      // Should show save/cancel buttons
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should call updateFormRegistry on save', async () => {
      const mockUpdate = vi.mocked(updateFormRegistry);
      mockUpdate.mockResolvedValueOnce(undefined);
      
      render(<FormsTable forms={mockForms} isAdmin={true} />);
      
      // Click edit
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      
      // Change version
      const versionInput = screen.getByDisplayValue('20-18');
      fireEvent.change(versionInput, { target: { value: '20-19' } });
      
      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('TREC-20', {
          expected_version: '20-19',
          effective_date: '2025-01-03'
        });
      });
    });

    it('should handle date changes', async () => {
      const mockUpdate = vi.mocked(updateFormRegistry);
      mockUpdate.mockResolvedValueOnce(undefined);
      
      render(<FormsTable forms={mockForms} isAdmin={true} />);
      
      // Click edit on second form (no date)
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[1]);
      
      // Add a date
      const dateInput = screen.getByPlaceholderText('YYYY-MM-DD');
      fireEvent.change(dateInput, { target: { value: '2025-06-01' } });
      
      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('TREC-40-11', {
          expected_version: '40-11',
          effective_date: '2025-06-01'
        });
      });
    });

    it('should cancel editing on cancel click', () => {
      render(<FormsTable forms={mockForms} isAdmin={true} />);
      
      // Click edit
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      
      // Change version
      const versionInput = screen.getByDisplayValue('20-18');
      fireEvent.change(versionInput, { target: { value: '20-19' } });
      
      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      // Should revert to display mode with original value
      expect(screen.getByText('20-18')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('20-19')).not.toBeInTheDocument();
    });

    it('should show error message on update failure', async () => {
      const mockUpdate = vi.mocked(updateFormRegistry);
      mockUpdate.mockRejectedValueOnce(new Error('Update failed'));
      
      render(<FormsTable forms={mockForms} isAdmin={true} />);
      
      // Click edit and save
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
      });
    });
  });
});