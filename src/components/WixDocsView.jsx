import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Copy, Check, ExternalLink, Download, Settings, Key, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function WixDocsView({ isLoggedIn, profile, onGetStarted, onGoToDashboard }) {
  const [copied, setCopied] = useState({})
  const [isInstalledApp, setIsInstalledApp] = useState(false)

  // Check for ?app=installed query parameter
  useEffect(() => {
    const checkQueryParam = () => {
      const params = new URLSearchParams(window.location.search)
      setIsInstalledApp(params.get('app') === 'installed')
    }
    
    // Check on mount
    checkQueryParam()
    
    // Listen for URL changes (back/forward navigation)
    const handlePopState = () => checkQueryParam()
    window.addEventListener('popstate', handlePopState)
    
    // Check periodically for query param changes (when URL is updated programmatically)
    // This handles cases where the URL is updated via pushState/replaceState
    const interval = setInterval(checkQueryParam, 500)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
      clearInterval(interval)
    }
  }, [])

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
              {isInstalledApp ? (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-semibold mb-1">
                  {isInstalledApp ? 'App Installed ✓' : 'Install from Wix App Market'}
                </h4>
                {isInstalledApp ? (
                  <p className="text-sm text-muted-foreground mb-3">
                    Great! The PDF Generator app is already installed on your Wix site. Continue to the next step to configure it.
                  </p>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Get Your Public API Key</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {isLoggedIn ? (
                    <>You're already signed in! Get your <strong>public API key</strong> (like for widget) from your dashboard. This is the same API key used for the widget integration.</>
                  ) : (
                    <>Sign up for a free DocuSkribe account and get your <strong>public API key</strong> (like for widget) from the dashboard. This is the same API key used for the widget integration.</>
                  )}
                </p>
                {isLoggedIn ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onGoToDashboard}
                    className="mb-2"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open('https://www.docuskribe.com/dashboard', '_blank')}
                    className="mb-2"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Get API Key (Free)
                  </Button>
                )}
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
              {isInstalledApp ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span>App Installed ✓</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">1.</span>
                  Installing the App
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalledApp ? (
              <div className="space-y-3">
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Great!</strong> The PDF Generator app is already installed on your Wix site. Continue to the next step to configure it with your public API key.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
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
            )}
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
                The PDF Generator widget uses DocuSkribe's <strong>public API</strong> to generate PDFs (the same API used for the widget integration). You'll need a free <strong>public API key</strong> to get started.
              </p>
              
              {!isLoggedIn ? (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold">Create a DocuSkribe Account</h4>
                  <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                    <li>Visit <a href="https://www.docuskribe.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.docuskribe.com</a></li>
                    <li>Click <strong>Get Started</strong> or <strong>Sign Up</strong></li>
                    <li>Create your account (it's free!)</li>
                    <li>Once logged in, go to your Dashboard</li>
                    <li>Navigate to the <strong>Widget</strong> tab</li>
                    <li>Find your <strong>Public API Key</strong> (starts with <code className="bg-background px-1 rounded">pk_live_</code>) - this is the same key used for widget integration</li>
                    <li>Copy the public API key - you'll need it in the next step</li>
                  </ol>
                </div>
              ) : (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold">Get Your Public API Key</h4>
                  <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                    <li>Go to your Dashboard</li>
                    <li>Navigate to the <strong>Widget</strong> tab</li>
                    <li>Find your <strong>Public API Key</strong> (starts with <code className="bg-background px-1 rounded">pk_live_</code>) - this is the same key used for widget integration</li>
                    <li>Copy the public API key - you'll need it in the next step</li>
                  </ol>
                </div>
              )}

              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Make sure to add your Wix domain to the authorized domains list in your DocuSkribe dashboard. 
                  This ensures the API key works correctly with your Wix site.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                {isLoggedIn ? (
                  <Button 
                    variant="outline"
                    onClick={onGoToDashboard}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
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
                  </>
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
                    Paste your <strong>public API key</strong> (the same one used for widget integration) from DocuSkribe dashboard here. Make sure your Wix domain is added to authorized domains.
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

        {/* Step 5: Using Velo Code (Advanced) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">5.</span>
              Setting Attributes with Velo Code (Advanced)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                You can dynamically set widget attributes using Wix Velo code. This is useful for updating settings based on user interactions, page context, or dynamic data.
              </p>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold mb-2">Getting the Widget Element</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  First, make sure your widget has an ID set in the Wix Editor. Then use <code className="bg-muted px-1 rounded">$w()</code> to select it:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto"><code>{`// Get the widget element (replace "myDocuskribeWidget" with your widget's ID)
const widget = $w("#myDocuskribeWidget");`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold mb-2">Setting Attributes</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Use the <code className="bg-muted px-1 rounded">setAttribute()</code> method to update any widget attribute:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto"><code>{`// Set button text
widget.setAttribute("button-text", "Download PDF");

// Set PDF format
widget.setAttribute("pdf-format", "Letter");

// Set custom URL source
widget.setAttribute("url-source", "custom");
widget.setAttribute("custom-url", "https://example.com/page");

// Set margins
widget.setAttribute("pdf-margin-top", "20px");
widget.setAttribute("pdf-margin-right", "20px");
widget.setAttribute("pdf-margin-bottom", "20px");
widget.setAttribute("pdf-margin-left", "20px");

// Set form factor
widget.setAttribute("form-factor", "mobile");

// Set output type
widget.setAttribute("output-type", "screenshot");
widget.setAttribute("screenshot-type", "png");
widget.setAttribute("screenshot-quality", "95");`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold mb-2">Setting the Data Attribute</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  The <code className="bg-muted px-1 rounded">data</code> attribute accepts a JSON string. When changed, it automatically updates the data property sent to the API:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto"><code>{`// Set data attribute (must be valid JSON string)
const dataObject = {
  userId: "12345",
  orderId: "ORD-67890",
  customParam: "value"
};

widget.setAttribute("data", JSON.stringify(dataObject));

// When the attribute changes, the widget automatically:
// 1. Parses the JSON
// 2. Updates the internal config
// 3. Uses the new data in the next API call`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold mb-2">Example: Dynamic Data Based on Page Context</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Here's a complete example that sets data based on the current page or user context:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto"><code>{`import wixUsers from 'wix-users';

$w.onReady(function () {
  const widget = $w("#myDocuskribeWidget");
  
  // Get current user information
  const user = wixUsers.currentUser;
  
  // Set data attribute with user and page context
  const dynamicData = {
    pageUrl: window.location.href,
    timestamp: new Date().toISOString(),
    userId: user ? user.id : "anonymous",
    pageTitle: document.title
  };
  
  widget.setAttribute("data", JSON.stringify(dynamicData));
  
  // Update button text based on context
  widget.setAttribute("button-text", "Download This Page as PDF");
});`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-indigo-500 pl-4">
                <h4 className="font-semibold mb-2">Example: Update on Button Click</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Update widget attributes when another element is clicked:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto"><code>{`$w.onReady(function () {
  const widget = $w("#myDocuskribeWidget");
  const updateButton = $w("#updateButton");
  
  updateButton.onClick(() => {
    // Update data with current form values or selections
    const formData = {
      selectedOption: $w("#dropdown").value,
      textInput: $w("#textInput").value
    };
    
    widget.setAttribute("data", JSON.stringify(formData));
    widget.setAttribute("button-text", "Generate PDF with Current Settings");
  });
});`}</code></pre>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Note:</strong> When you change the <code className="bg-background px-1 rounded">data</code> attribute, the widget automatically updates its internal configuration. The new data will be used the next time the PDF generation button is clicked.
                </AlertDescription>
              </Alert>

              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="font-semibold mb-2">Available Attributes</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Here are all the attributes you can set via Velo code:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm text-muted-foreground">
                  <li><code className="bg-background px-1 rounded">public-api-key</code> - Your DocuSkribe public API key</li>
                  <li><code className="bg-background px-1 rounded">url-source</code> - "current" or "custom"</li>
                  <li><code className="bg-background px-1 rounded">custom-url</code> - URL to convert (when url-source is "custom")</li>
                  <li><code className="bg-background px-1 rounded">pdf-format</code> - "A4", "Letter", "Legal", etc.</li>
                  <li><code className="bg-background px-1 rounded">pdf-margin-top</code>, <code className="bg-background px-1 rounded">pdf-margin-right</code>, <code className="bg-background px-1 rounded">pdf-margin-bottom</code>, <code className="bg-background px-1 rounded">pdf-margin-left</code> - Margin values (e.g., "50px", "1in")</li>
                  <li><code className="bg-background px-1 rounded">form-factor</code> - "desktop" or "mobile"</li>
                  <li><code className="bg-background px-1 rounded">output-type</code> - "pdf" or "screenshot"</li>
                  <li><code className="bg-background px-1 rounded">screenshot-type</code> - "png", "jpeg", or "webp"</li>
                  <li><code className="bg-background px-1 rounded">screenshot-quality</code> - Number from 1-100</li>
                  <li><code className="bg-background px-1 rounded">button-text</code> - Button label text</li>
                  <li><code className="bg-background px-1 rounded">data</code> - JSON string for custom data to pass to API</li>
                  <li><code className="bg-background px-1 rounded">button-css</code> - Custom CSS for the button</li>
                  <li><code className="bg-background px-1 rounded">button-icon</code> - Icon URL or SVG</li>
                  <li><code className="bg-background px-1 rounded">button-icon-position</code> - "left", "right", "top", or "bottom"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 6: Publishing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">6.</span>
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
                <li>Verify your <strong>public API key</strong> is correct and starts with <code className="bg-background px-1 rounded">pk_live_</code> (this is the same key used for widget integration)</li>
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
          {!isInstalledApp && (
            <Button 
              size="lg" 
              className="bg-white text-blue-700 hover:bg-blue-50"
              onClick={() => window.open('https://wix.to/MMv9cAJ', '_blank')}
            >
              <Download className="mr-2 h-5 w-5" />
              Install from Wix App Market
            </Button>
          )}
          {isInstalledApp && (
            <div className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">App Installed ✓</span>
            </div>
          )}
          {isLoggedIn ? (
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={onGoToDashboard}
            >
              Go to Dashboard
            </Button>
          ) : onGetStarted && (
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={onGetStarted}
            >
              Get Your Free Public API Key
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

