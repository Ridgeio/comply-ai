'use client'

import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState, useCallback, useRef } from 'react'

import { uploadFiles } from '../actions/uploadFiles'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'


interface FileUploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  message?: string
}

export default function UploadPage() {
  const params = useParams()
  const router = useRouter()
  const txId = params.txId as string
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }

  const addFiles = (newFiles: File[]) => {
    const pdfFiles = newFiles.filter(file => file.type === 'application/pdf')
    const nonPdfCount = newFiles.length - pdfFiles.length
    
    if (nonPdfCount > 0) {
      setUploadError(`${nonPdfCount} non-PDF file(s) were filtered out`)
    }
    
    const fileStatuses: FileUploadStatus[] = pdfFiles.map(file => ({
      file,
      status: 'pending'
    }))
    
    setFiles(prev => [...prev, ...fileStatuses])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    
    setIsUploading(true)
    setUploadError(null)
    
    // Update all files to uploading status
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })))
    
    try {
      // Create FormData with all files
      const formData = new FormData()
      formData.append('txId', txId)
      files.forEach(({ file }) => {
        formData.append('files', file)
      })
      
      // Upload files
      const result = await uploadFiles(formData)
      
      if (result.success && result.files) {
        // Update file statuses based on result
        setFiles(prev => prev.map((fileStatus, _index) => {
          const uploadedFile = result.files?.find(f => 
            f.name === fileStatus.file.name
          )
          
          if (uploadedFile) {
            return {
              ...fileStatus,
              status: 'success',
              message: `Uploaded as ${uploadedFile.fileId}`
            }
          } else {
            return {
              ...fileStatus,
              status: 'error',
              message: 'Upload failed'
            }
          }
        }))
        
        // Navigate to transaction page after a short delay
        setTimeout(() => {
          router.push(`/transactions/${txId}`)
        }, 2000)
      } else {
        setUploadError(result.error || 'Upload failed')
        setFiles(prev => prev.map(f => ({ 
          ...f, 
          status: 'error',
          message: 'Upload failed'
        })))
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('An unexpected error occurred')
      setFiles(prev => prev.map(f => ({ 
        ...f, 
        status: 'error',
        message: 'Upload failed'
      })))
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading...</Badge>
      case 'success':
        return <Badge className="bg-green-500">Uploaded</Badge>
      case 'error':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Ready</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload PDF documents for transaction {txId}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              Drag & drop PDF files here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-4">
              Only PDF files up to 20MB are accepted
            </p>
          </div>

          {/* Error Alert */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Selected Files ({files.length})</h3>
              <div className="space-y-2">
                {files.map((fileStatus, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(fileStatus.status)}
                      <div>
                        <p className="text-sm font-medium">
                          {fileStatus.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {fileStatus.message && (
                          <p className="text-xs text-gray-600 mt-1">
                            {fileStatus.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(fileStatus.status)}
                      {fileStatus.status === 'pending' && !isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push(`/transactions/${txId}`)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}