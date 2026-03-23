'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { productApi } from '@/services/api/products'
import { BulkUploadResult } from '@/types'
import { toast } from '@/hooks/useToast'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<BulkUploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sampleCsv = `name,description,price,category,size,color,stock,image_url
Classic Cotton T-Shirt,Premium cotton t-shirt for everyday wear,499,men,M,Black,50,https://example.com/image1.jpg
Slim Fit Jeans,Comfortable slim fit jeans,1299,men,32,Blue,30,https://example.com/image2.jpg
Floral Summer Dress,Beautiful floral pattern dress,899,women,S,Pink,25,https://example.com/image3.jpg
Running Sneakers,Lightweight running shoes,2499,footwear,10,White,40,https://example.com/image4.jpg
Casual Polo Shirt,Classic polo t-shirt,699,men,L,Navy,35,https://example.com/image5.jpg`

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'outfyt_bulk_upload_sample.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast({
      title: 'Downloaded',
      description: 'Sample CSV file downloaded successfully',
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile)
        setResult(null)
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: 'Please upload a CSV or Excel file',
        })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile)
        setResult(null)
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: 'Please upload a CSV or Excel file',
        })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await productApi.bulkUpload(formData)
      setResult(response)
      
      if (response.successCount > 0) {
        toast({
          title: 'Success',
          description: `${response.successCount} products uploaded successfully`,
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload products',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bulk Upload</h1>
        <p className="text-muted-foreground">Upload multiple products at once using CSV or Excel file</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Follow these steps to bulk upload your products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Download Sample CSV</p>
                  <p className="text-sm text-muted-foreground">
                    Get the template with correct column format
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Fill in your product data</p>
                  <p className="text-sm text-muted-foreground">
                    Add product details following the column headers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Upload the file</p>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or click to select your file
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleDownloadSample} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Sample CSV
            </Button>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Required Columns:</p>
              <code className="text-xs text-muted-foreground">
                name, description, price, category, size, color, stock, image_url
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Supported formats: CSV, XLSX (max 10MB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-full">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Remove
                  </Button>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-muted rounded-full">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Drop your file here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </div>
                  </div>
                </label>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Products
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upload Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">{result.successCount} Successful</span>
              </div>
              {result.failed.length > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">{result.failed.length} Failed</span>
                </div>
              )}
            </div>

            {result.successCount > 0 && (
              <Progress 
                value={(result.successCount / (result.successCount + result.failed.length)) * 100} 
                className="h-2"
              />
            )}

            {result.failed.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-destructive">Failed Rows:</p>
                <div className="max-h-48 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Row</th>
                        <th className="px-4 py-2 text-left">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.failed.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{item.row}</td>
                          <td className="px-4 py-2 text-destructive">{item.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
