import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Copy, Download } from 'lucide-react'

export default function JobResult({ result, outputType }) {
  const [objectUrl, setObjectUrl] = useState(null)
  const isScreenshot = outputType === 'screenshot'

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const base64ToBlob = (base64, type) => {
    const byteChars = atob(base64)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type })
  }

  const getMimeType = (url) => {
    if (url.endsWith('.png')) return 'image/png'
    if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg'
    if (url.endsWith('.webp')) return 'image/webp'
    if (url.endsWith('.pdf')) return 'application/pdf'
    return 'application/octet-stream'
  }

  if (result.type === 'url' && result.url) {
    const mimeType = getMimeType(result.url)
    const isImage = mimeType.startsWith('image/')

    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              Open {isScreenshot ? 'Screenshot' : 'PDF'}
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(result.url)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy URL
          </Button>
        </div>

        {typeof result.sizeMB === 'number' && (
          <p className="text-sm text-muted-foreground">
            ~{result.sizeMB} MB
          </p>
        )}

        <div className="border rounded-lg overflow-hidden">
          {isImage ? (
            <img
              src={result.url}
              alt="Result"
              className="w-full h-auto"
              loading="lazy"
            />
          ) : (
            <iframe
              src={result.url}
              className="w-full h-[480px] border-0"
              title="PDF Preview"
              loading="lazy"
            />
          )}
        </div>
      </div>
    )
  }

  if (result.type === 'buffer' && (result.pdf || result.data)) {
    const base64 = result.data || result.pdf
    
    // Create object URL on mount and clean up
    useEffect(() => {
      const mimeType = isScreenshot ? 'image/png' : 'application/pdf'
      const blob = base64ToBlob(base64, mimeType)
      const url = URL.createObjectURL(blob)
      setObjectUrl(url)
      
      return () => {
        URL.revokeObjectURL(url)
      }
    }, [base64, isScreenshot])

    const inferredSizeBytes = Math.floor((base64.length * 3) / 4)
    const sizeKB = Math.round(inferredSizeBytes / 1024)

    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          {typeof result.sizeMB === 'number'
            ? `Size: ~${result.sizeMB} MB`
            : `Received base64 buffer (~${sizeKB} KB)`}
        </p>

        {objectUrl && (
          <>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <a
                  href={objectUrl}
                  download={isScreenshot ? 'screenshot.png' : 'document.pdf'}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download {isScreenshot ? 'Screenshot' : 'PDF'}
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(base64)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy base64
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              {isScreenshot ? (
                <img
                  src={objectUrl}
                  alt="Result"
                  className="w-full h-auto"
                  loading="lazy"
                />
              ) : (
                <iframe
                  src={objectUrl}
                  className="w-full h-[480px] border-0"
                  title="PDF Preview"
                  loading="lazy"
                />
              )}
            </div>
          </>
        )}
        
        {!objectUrl && (
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        )}
      </div>
    )
  }

  return null
}

