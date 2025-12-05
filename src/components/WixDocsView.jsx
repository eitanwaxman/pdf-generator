import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Copy, Check, ExternalLink, Download, Settings, Key, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export default function WixDocsView({ onGetStarted }) {
  const [copied, setCopied] = useState({})

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [key]: true })
      setTimeout(() => {
        setCopied({ ...copied, [key]: false })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold">PDF Generator for Wix - Setup Guide</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Complete step-by-step instructions to install and configure the PDF Generator widget on your Wix site
        </p>
      </div>

      {/* Quick Start */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Get up and running in 5 minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Install from Wix App Market</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Go to the Wix App Market and search for "PDF Generator" or use the direct link below.
                </p>
                <Button 
                  size="sm" 
                  onClick={() => window.open('https://wix.to/MMv9cAJ', '_blank')}
                  className="mb-2"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Install from Wix App Market
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Get Your API Key</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Sign up for a free DocuSkribe account and get your public API key from the dashboard.
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open('https://www.docuskribe.com/dashboard', '_blank')}
                  className="mb-2"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Get API Key (Free)
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Configure in Wix Editor</h4>
                <p className="text-sm text-muted-foreground">
                  Add the widget to your page, open the settings panel, and paste your API key. 
                  Customize the button text and PDF options as needed.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Setup */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Detailed Setup Instructions</h2>

        {/* Step 1: Installation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">1.</span>
              Installing the App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-muted-foreground">
                To install the PDF Generator app on your Wix site:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Log in to your Wix account and open your site in the Wix Editor</li>
                <li>Click on <strong>Add</strong> → <strong>App</strong> in the left sidebar</li>
                <li>Search for "PDF Generator" or click the link below to go directly to the app</li>
                <li>Click <strong>Add to Site</strong> to install the app</li>
                <li>The app will be added to your site and you'll see it in your Apps list</li>
              </ol>
              <div className="mt-4">
                <Button 
                  onClick={() => window.open('https://wix.to/MMv9cAJ', '_blank')}
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Install PDF Generator from Wix App Market
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Getting API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">2.</span>
              Getting Your API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-muted-foreground">
                The PDF Generator widget uses DocuSkribe's API to generate PDFs. You'll need a free API key to get started.
              </p>
              
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h4 className="font-semibold">Create a DocuSkribe Account</h4>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                  <li>Visit <a href="https://www.docuskribe.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.docuskribe.com</a></li>
                  <li>Click <strong>Get Started</strong> or <strong>Sign Up</strong></li>
                  <li>Create your account (it's free!)</li>
                  <li>Once logged in, go to your Dashboard</li>
                  <li>Find your <strong>Public API Key</strong> (starts with <code className="bg-background px-1 rounded">pk_live_</code>)</li>
                  <li>Copy the API key - you'll need it in the next step</li>
                </ol>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Make sure to add your Wix domain to the authorized domains list in your DocuSkribe dashboard. 
                  This ensures the API key works correctly with your Wix site.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => window.open('https://www.docuskribe.com/dashboard', '_blank')}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Open DocuSkribe Dashboard
                </Button>
                {onGetStarted && (
                  <Button onClick={onGetStarted}>
                    Sign Up for DocuSkribe
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Adding Widget to Page */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">3.</span>
              Adding the Widget to Your Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Once the app is installed, you can add the PDF Generator widget to any page:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>In the Wix Editor, navigate to the page where you want to add the PDF button</li>
                <li>Click <strong>Add</strong> → <strong>App</strong> in the left sidebar</li>
                <li>Find <strong>PDF Generator</strong> in your installed apps</li>
                <li>Click on it to add the widget to your page</li>
                <li>The widget will appear as a button on your page</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">4.</span>
              Configuring the Widget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Click on the widget in the editor to open the settings panel. Here's what you can configure:
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold mb-2">API Configuration</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Paste your public API key from DocuSkribe dashboard here. Make sure your Wix domain is added to authorized domains.
                  </p>
                  <div className="bg-muted p-3 rounded text-sm font-mono">
                    pk_live_...
                  </div>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold mb-2">PDF Source</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose whether to generate PDF from the current page URL or a custom URL. 
                    Most users select "Current Page URL" to let visitors download the page they're viewing.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold mb-2">Output Type</h4>
                  <p className="text-sm text-muted-foreground">
                    Select <strong>PDF</strong> to generate PDF documents or <strong>Screenshot</strong> to capture images. 
                    PDFs are great for documents, screenshots are perfect for quick captures.
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold mb-2">PDF Format (PDF only)</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose the page size: A4, Letter, Legal, Tabloid, or other standard formats. 
                    A4 is the most common for international use, Letter for US documents.
                  </p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-semibold mb-2">PDF Margins (PDF only)</h4>
                  <p className="text-sm text-muted-foreground">
                    Set margins for your PDFs. Default is 50px on all sides. 
                    You can use CSS units like px, cm, or in (e.g., "1in", "2cm", "20px").
                  </p>
                </div>

                <div className="border-l-4 border-indigo-500 pl-4">
                  <h4 className="font-semibold mb-2">Form Factor</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose <strong>Desktop</strong> for standard web rendering or <strong>Mobile</strong> for mobile-optimized views. 
                    This affects how the page is rendered before conversion.
                  </p>
                </div>

                <div className="border-l-4 border-pink-500 pl-4">
                  <h4 className="font-semibold mb-2">Button Text</h4>
                  <p className="text-sm text-muted-foreground">
                    Customize the text on the button. Default is "Generate PDF" but you can change it to 
                    "Download PDF", "Save as PDF", or anything you prefer.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-semibold mb-2">Query Parameters (Advanced)</h4>
                  <p className="text-sm text-muted-foreground">
                    Add custom query parameters to the URL before conversion. 
                    Useful for passing dynamic data or filtering content.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 5: Publishing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">5.</span>
              Publishing Your Site
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Once you've configured the widget:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Review your settings to make sure everything is correct</li>
                <li>Click <strong>Publish</strong> in the top right of the Wix Editor</li>
                <li>Visit your live site and test the PDF generation button</li>
                <li>Click the button to generate a PDF and verify it works correctly</li>
              </ol>
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tip:</strong> Test the widget on your published site before sharing it with visitors. 
                  Make sure your API key is valid and your domain is authorized in DocuSkribe.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Troubleshooting */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">PDF generation fails or shows an error</h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm text-muted-foreground">
                <li>Verify your API key is correct and starts with <code className="bg-background px-1 rounded">pk_live_</code></li>
                <li>Check that your Wix domain is added to authorized domains in DocuSkribe dashboard</li>
                <li>Ensure you have credits remaining in your DocuSkribe account</li>
                <li>Check the browser console for detailed error messages</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Button doesn't appear on the page</h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm text-muted-foreground">
                <li>Make sure you've added the widget to the page in the Wix Editor</li>
                <li>Check that the widget isn't hidden or positioned off-screen</li>
                <li>Try removing and re-adding the widget</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">PDF format or margins look wrong</h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm text-muted-foreground">
                <li>Double-check your PDF format selection (A4, Letter, etc.)</li>
                <li>Verify margin values are in correct format (e.g., "50px", "1in", "2cm")</li>
                <li>Test with different margin values to find what works best for your content</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Need more help?</h4>
              <p className="text-sm text-muted-foreground mb-2">
                If you're still experiencing issues, check the DocuSkribe documentation or contact support.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://www.docuskribe.com/docs', '_blank')}
                >
                  View Full Documentation
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://www.docuskribe.com/dashboard', '_blank')}
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">Is the app free to use?</h4>
            <p className="text-sm text-muted-foreground">
              The app itself is free to install from the Wix App Market. PDF generation is powered by DocuSkribe, 
              which offers a generous free tier. You can upgrade to a paid plan if you need more credits.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Do I need coding knowledge?</h4>
            <p className="text-sm text-muted-foreground">
              No! The widget is fully configurable through the Wix Editor settings panel. 
              You just need to paste your API key and adjust the settings as needed.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Can I customize the button appearance?</h4>
            <p className="text-sm text-muted-foreground">
              Yes! You can customize the button text in the settings. For advanced styling, 
              you can use Wix's design tools to style the widget container.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What file formats are supported?</h4>
            <p className="text-sm text-muted-foreground">
              The widget can generate PDFs in various formats (A4, Letter, Legal, etc.) and screenshots 
              in PNG, JPEG, or WebP formats.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Is my data secure?</h4>
            <p className="text-sm text-muted-foreground">
              Yes. PDFs are generated server-side and delivered directly to users. 
              No data is stored permanently, and your API keys are secure.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-blue-100 mb-6">
          Install the PDF Generator app and enhance your Wix site today
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="bg-white text-blue-700 hover:bg-blue-50"
            onClick={() => window.open('https://wix.to/MMv9cAJ', '_blank')}
          >
            <Download className="mr-2 h-5 w-5" />
            Install from Wix App Market
          </Button>
          {onGetStarted && (
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={onGetStarted}
            >
              Get Your Free API Key
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

