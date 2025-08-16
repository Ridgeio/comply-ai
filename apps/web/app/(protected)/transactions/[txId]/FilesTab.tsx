'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { format } from 'date-fns'
import { uploadFiles } from '@/src/app/transactions/[txId]/actions/uploadFiles'
import {
  listFilesWithJobStatus,
  getSignedUrl
} from '@/src/app/transactions/[txId]/actions/fileActions'
import type { FileWithJobStatus } from '@/src/app/transactions/[txId]/actions/types'
import { generateReport } from '@/src/app/transactions/[txId]/actions/reportActions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  Eye, 
  FileCheck, 
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface FilesTabProps {
  txId: string
}

export function FilesTab({ txId }: FilesTabProps) {
  const router = useRouter()
  const [files, setFiles] = useState<FileWithJobStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // Check if any files are in OCR mode
  const hasOcrFiles = files.some(f => f.extraction_mode === 'ocr')

  // Load files on mount and after uploads
  const loadFiles = useCallback(async () => {
    try {
      const fileList = await listFilesWithJobStatus(txId)
      setFiles(fileList)
    } catch (err) {
      console.error('Failed to load files:', err)
      setError('Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }, [txId])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Clear previous errors
    setUploadError(null)

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(({ file, errors }) => {
        if (errors.some((e: any) => e.code === 'file-invalid-type')) {
          return 'Only PDF files are allowed'
        }
        if (errors.some((e: any) => e.code === 'file-too-large')) {
          return 'File size must be less than 20MB'
        }
        return `${file.name}: Invalid file`
      })
      setUploadError(errors.join('. '))
      return
    }

    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('txId', txId)
      acceptedFiles.forEach(file => {
        formData.append('files', file)
      })

      // Upload files
      const result = await uploadFiles(formData)

      if (result.success) {
        // Refresh the page to show new files
        router.refresh()
        await loadFiles()
        
        if (result.error) {
          // Partial success - show warning
          setUploadError(result.error)
        }
      } else {
        setUploadError(result.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsUploading(false)
    }
  }, [txId, router, loadFiles])

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
    disabled: isUploading
  })

  // Handle view file
  const handleViewFile = async (path: string) => {
    try {
      const result = await getSignedUrl(path)
      if (result.signedUrl) {
        window.open(result.signedUrl, '_blank')
      } else {
        setError(result.error || 'Failed to get file URL')
      }
    } catch (err) {
      console.error('Failed to get signed URL:', err)
      setError('Failed to open file')
    }
  }

  // Handle generate report
  const handleGenerateReport = async (fileId: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateReport({
        txId,
        primaryFileId: fileId
      })

      if (result) {
        // Navigate to the Report tab
        router.push(`/transactions/${txId}?tab=report`)
      }
    } catch (err) {
      console.error('Failed to generate report:', err)
      setError('Failed to generate report: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsGenerating(false)
    }
  }

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'processing':
        return 'secondary'
      case 'queued':
        return 'outline'
      case 'error':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />
      case 'processing':
        return <Loader2 className="h-3 w-3 animate-spin" />
      case 'queued':
        return <Clock className="h-3 w-3" />
      case 'error':
        return <XCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  // Format status for display
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* OCR Mode Banner */}
      {hasOcrFiles && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Scanned mode may reduce accuracy. Some documents were processed using OCR text extraction.
          </AlertDescription>
        </Alert>
      )}

      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            data-testid="dropzone"
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-primary" />
                <p className="text-sm font-medium">Drop the files here</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Drag and drop PDF files here</p>
                <p className="text-xs text-muted-foreground">or click to select files</p>
                <p className="text-xs text-muted-foreground mt-2">Maximum file size: 20MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files table */}
      {files.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {file.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(file.job_status)} className="gap-1">
                        {getStatusIcon(file.job_status)}
                        {formatStatus(file.job_status)}
                      </Badge>
                      {file.job_error && (
                        <p className="text-xs text-destructive mt-1">{file.job_error}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(file.created_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewFile(file.path)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={file.job_status !== 'completed' || isGenerating}
                          onClick={() => handleGenerateReport(file.id)}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <FileCheck className="h-3 w-3 mr-1" />
                          )}
                          Generate Report
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        !isUploading && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No files uploaded yet</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}