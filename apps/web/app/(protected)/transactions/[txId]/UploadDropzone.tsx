'use client';

import { Upload, AlertCircle, FileText } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadDropzoneProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FILE_TYPE = 'application/pdf';

export function UploadDropzone({ onUpload, disabled = false, className }: UploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[], errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      // Check file type
      if (file.type !== ACCEPTED_FILE_TYPE && !file.name.toLowerCase().endsWith('.pdf')) {
        errors.push(`${file.name}: Only PDF files are allowed`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size must be less than 20MB`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, []);

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    setValidationError(null);
    
    // Validate files
    const { valid, errors } = validateFiles(acceptedFiles);
    
    if (errors.length > 0) {
      setValidationError(errors.join('\n'));
      return;
    }

    if (valid.length === 0) {
      return;
    }

    // Start upload
    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress (in real app, you'd track actual upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await onUpload(valid);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset after a short delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploading(false);
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
      setValidationError(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onUpload, validateFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: (rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        setValidationError('Only PDF files are allowed');
      }
    },
    accept: {
      'application/pdf': ['.pdf']
    },
    disabled: disabled || uploading,
    multiple: true
  });

  const isDisabled = disabled || uploading;

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        data-testid="upload-dropzone"
        data-disabled={isDisabled}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragActive && !isDisabled && 'border-primary bg-primary/5',
          !isDragActive && !isDisabled && 'border-muted-foreground/25 hover:border-primary/50',
          isDisabled && 'opacity-50 cursor-not-allowed border-muted-foreground/25 bg-muted/50'
        )}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <FileText className="h-12 w-12 text-muted-foreground animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploading files...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
            </div>
            
            {isDragActive ? (
              <p className="text-lg font-medium">Drop PDF files here</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">Drag and drop PDF files</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
                <p className="text-xs text-muted-foreground">Maximum file size: 20MB</p>
              </div>
            )}
          </>
        )}
      </div>

      {validationError && (
        <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-sm text-destructive whitespace-pre-line">
              {validationError}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}