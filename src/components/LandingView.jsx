import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export default function LandingView({ isLoggedIn, profile, onGetStarted, onViewDocs, onViewPlans, onViewWix, onGoToDashboard }) {
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
      {/* Header with Sign In / Dashboard */}
      <div className="container max-w-6xl mx-auto px-4 pt-6 pb-4">
        <div className="flex justify-end">
          {isLoggedIn ? (
            <Button variant="ghost" onClick={onGoToDashboard} className="hover:bg-accent/50 transition-colors">
              Go to Dashboard
            </Button>
          ) : (
            <Button variant="ghost" onClick={onGetStarted} className="hover:bg-accent/50 transition-colors">
              Sign In
            </Button>
          )}
        </div>
      </div>
      
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

        <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
          {isLoggedIn ? (
            <>
              <Button size="lg" onClick={onGoToDashboard} className="shadow-lg hover:shadow-xl transition-shadow">
                Go to Dashboard
              </Button>
              {profile?.tier === 'free' && (
                <Button size="lg" variant="outline" onClick={onViewPlans} className="border-2 hover:bg-accent transition-colors">
                  Upgrade Plan
                </Button>
              )}
              <Button size="lg" variant="outline" onClick={onViewDocs} className="border-2 hover:bg-accent transition-colors">
                View API docs
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" onClick={onGetStarted} className="shadow-lg hover:shadow-xl transition-shadow">
                Get started for free
              </Button>
              <Button size="lg" variant="outline" onClick={onViewDocs} className="border-2 hover:bg-accent transition-colors">
                View API docs
              </Button>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">Fast & scalable</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built for performance with queue-backed workers so your PDFs render quickly and reliably.
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">URL-based generation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Convert any website URL to PDF or screenshot. Supports custom formats, viewports, and output types.
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">Simple pricing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generous free tier to get started. Upgrade anytime as you scale.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-semibold text-xl mb-2">Quick start</h2>
                <p className="text-sm text-muted-foreground">
                  Generate a PDF from any URL with a simple API call
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2 transition-all"
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
                <Button variant="secondary" size="sm" onClick={onViewDocs} className="transition-all">
                  Full docs
                </Button>
              </div>
            </div>
            <div className="relative">
              <pre className="text-sm overflow-x-auto p-4 rounded-lg bg-muted/50 font-mono border-2 border-muted">
                <code className="text-foreground">{exampleCode}</code>
              </pre>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium">Response:</p>
              <pre className="text-xs p-3 rounded-lg bg-muted/30 border border-muted font-mono overflow-x-auto">
                <code className="text-foreground/90">{`{
  "jobId": "abc123...",
  "status": "pending",
  "message": "Job created successfully"
}`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {!isLoggedIn && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Ready to scale?</p>
            <Button variant="outline" onClick={onViewPlans}>Compare plans</Button>
          </div>
        )}
        {isLoggedIn && profile?.tier === 'free' && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Ready to scale?</p>
            <Button variant="outline" onClick={onViewPlans}>Upgrade your plan</Button>
          </div>
        )}

        {/* Wix App Section */}
        <div className="mt-16 border-t pt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Also Available for Wix</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Use DocuSkribe directly in your Wix site with our easy-to-install app from the Wix App Market
            </p>
          </div>
          <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="font-semibold text-xl mb-2">PDF Generator for Wix</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    Add PDF and screenshot generation to your Wix site with a single click. 
                    No coding required - just install the app and configure it in the Wix Editor.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={onViewWix} className="gap-2 shadow-md hover:shadow-lg transition-shadow">
                      <ExternalLink className="h-4 w-4" />
                      View Wix App
                    </Button>
                    <Button variant="outline" onClick={() => onViewWix && typeof onViewWix === 'function' ? onViewWix() : window.open('https://wix.to/MMv9cAJ', '_blank')} className="border-2 hover:bg-accent transition-colors">
                      Install from Wix App Market
                    </Button>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-2 shadow-sm">
                    Wix App Market
                  </div>
                  <p className="text-sm text-muted-foreground">Free to install</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


