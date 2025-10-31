import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function LandingView({ onGetStarted, onViewDocs, onViewPlans }) {
  const [copied, setCopied] = useState(false)

  const exampleCode = `curl -X POST https://api.yourdomain.com/api/v1/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "options": {
      "outputType": "pdf",
      "responseType": "url",
      "pdfOptions": {
        "format": "A4"
      }
    }
  }'`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exampleCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Docuskribe
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-muted-foreground">
            Generate beautiful PDFs and screenshots from URLs in minutes
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            A simple, reliable PDF and screenshot generation API with fast rendering, queue-backed workers, and fair pricing.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-14">
          <Button size="lg" onClick={onGetStarted}>
            Get started for free
          </Button>
          <Button size="lg" variant="outline" onClick={onViewDocs}>
            View API docs
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">Fast & scalable</h3>
              <p className="text-sm text-muted-foreground">
                Built for performance with queue-backed workers so your PDFs render quickly and reliably.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">URL-based generation</h3>
              <p className="text-sm text-muted-foreground">
                Convert any website URL to PDF or screenshot. Supports custom formats, viewports, and output types.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">Simple pricing</h3>
              <p className="text-sm text-muted-foreground">
                Generous free tier to get started. Upgrade anytime as you scale.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="border rounded-lg p-6 bg-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg mb-1">Quick start</h2>
              <p className="text-sm text-muted-foreground">
                Generate a PDF from any URL with a simple API call
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="secondary" size="sm" onClick={onViewDocs}>
                Full docs
              </Button>
            </div>
          </div>
          <div className="relative">
            <pre className="text-sm overflow-x-auto p-4 rounded-md bg-muted font-mono border">
              <code>{exampleCode}</code>
            </pre>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="mb-1">Response:</p>
            <pre className="text-xs p-3 rounded-md bg-muted/50 border font-mono overflow-x-auto">
              <code>{`{
  "jobId": "abc123...",
  "status": "pending",
  "message": "Job created successfully"
}`}</code>
            </pre>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Ready to scale?</p>
          <Button variant="outline" onClick={onViewPlans}>Compare plans</Button>
        </div>
      </div>
    </div>
  )
}


