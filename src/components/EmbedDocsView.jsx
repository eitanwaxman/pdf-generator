import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Code, Shield, Zap, Globe } from 'lucide-react'

export default function EmbedDocsView({ onGetStarted }) {
  const exampleEmbedCode = `<!-- Docuskribe Widget -->
<script src="https://api.docuskribe.com/cdn/widget/bundle.js"></script>
<docuskribe-widget
  public-key="pk_live_your_public_key_here"
  output-type="pdf"
  pdf-format="A4"
  button-text="Download PDF"
></docuskribe-widget>`

  const exampleCustomUrl = `<docuskribe-widget
  public-key="pk_live_your_key"
  url-source="custom"
  custom-url="https://example.com/page"
  output-type="pdf"
></docuskribe-widget>`

  const exampleScreenshot = `<docuskribe-widget
  public-key="pk_live_your_key"
  output-type="screenshot"
  screenshot-type="png"
  screenshot-full-page="true"
  button-text="Take Screenshot"
></docuskribe-widget>`

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold">Embed PDF & Screenshot Generation</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Add a simple widget to your website that lets users generate PDFs and screenshots
          with a single click. No backend required.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button size="lg" onClick={onGetStarted}>
            Get Started Free
          </Button>
          <Button size="lg" variant="outline" onClick={() => {
            document.getElementById('setup-guide').scrollIntoView({ behavior: 'smooth' })
          }}>
            View Setup Guide
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Easy to Integrate</CardTitle>
            <CardDescription>
              Copy and paste a single code snippet. No complex setup or backend required.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Secure by Design</CardTitle>
            <CardDescription>
              Public keys restricted to authorized domains. Your credentials stay safe.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Globe className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Works Everywhere</CardTitle>
            <CardDescription>
              Compatible with any website platform. WordPress, React, vanilla HTML, you name it.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Live Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Live Demo</CardTitle>
          <CardDescription>
            See the widget in action (requires a public key to work)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-8 rounded-lg text-center">
            <p className="text-muted-foreground mb-4">
              Widget preview will appear here once you create a public key
            </p>
            <div className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg">
              Generate PDF
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card id="setup-guide">
        <CardHeader>
          <CardTitle>Setup Guide</CardTitle>
          <CardDescription>
            Get your widget up and running in minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Sign Up & Create a Public Key</h3>
                <p className="text-muted-foreground mb-2">
                  Create a free account and navigate to the Widget tab in your dashboard.
                  Create a new public key and add your website's domain to the authorized domains list.
                </p>
                <div className="bg-muted p-3 rounded mt-2">
                  <code className="text-sm">
                    Authorized domains: example.com, *.example.com, localhost:*
                  </code>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Configure Your Widget</h3>
                <p className="text-muted-foreground mb-2">
                  Customize the widget's appearance and behavior in the dashboard.
                  Choose PDF or screenshot output, set page format, margins, and button text.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Copy the Embed Code</h3>
                <p className="text-muted-foreground mb-2">
                  Copy the generated embed code from your dashboard and paste it into your website's HTML.
                </p>
                <div className="bg-muted p-4 rounded mt-2 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{exampleEmbedCode}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Done!</h3>
                <p className="text-muted-foreground">
                  Your widget is now live. Users can click the button to generate PDFs or screenshots
                  of your web pages instantly.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>
            Common widget configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Basic PDF Generation</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Generate a PDF of the current page
            </p>
            <div className="bg-muted p-4 rounded overflow-x-auto">
              <pre className="text-sm">
                <code>{exampleEmbedCode}</code>
              </pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Custom URL</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Generate a PDF of a specific URL instead of the current page
            </p>
            <div className="bg-muted p-4 rounded overflow-x-auto">
              <pre className="text-sm">
                <code>{exampleCustomUrl}</code>
              </pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Screenshot Mode</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Capture a screenshot instead of generating a PDF
            </p>
            <div className="bg-muted p-4 rounded overflow-x-auto">
              <pre className="text-sm">
                <code>{exampleScreenshot}</code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            How we keep your API usage secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Public Keys vs Private Keys</h3>
            <p className="text-muted-foreground">
              Public keys (pk_live_...) are designed for client-side use. They can only be used
              from domains you explicitly authorize in your dashboard.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Domain Authorization</h3>
            <p className="text-muted-foreground">
              Our backend validates the Origin header of each request against your authorized domains.
              Requests from unauthorized domains are automatically rejected.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Wildcard Domains</h3>
            <p className="text-muted-foreground mb-2">
              You can use wildcards to authorize all subdomains:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground ml-4">
              <li><code>example.com</code> - Only the exact domain</li>
              <li><code>*.example.com</code> - All subdomains (app.example.com, demo.example.com, etc.)</li>
              <li><code>localhost:*</code> - Any port on localhost (for development)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Credit Usage</h3>
            <p className="text-muted-foreground">
              All widget requests count against your account's credit limit, just like API requests.
              You can monitor usage in your dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Attributes */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Attributes</CardTitle>
          <CardDescription>
            Complete list of configuration options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Attribute</th>
                  <th className="text-left p-2 font-semibold">Type</th>
                  <th className="text-left p-2 font-semibold">Default</th>
                  <th className="text-left p-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2"><code>public-key</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2"><em>required</em></td>
                  <td className="p-2">Your public API key (pk_live_...)</td>
                </tr>
                <tr>
                  <td className="p-2"><code>url-source</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2">current</td>
                  <td className="p-2">"current" or "custom"</td>
                </tr>
                <tr>
                  <td className="p-2"><code>custom-url</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2">-</td>
                  <td className="p-2">URL to convert (if url-source is "custom")</td>
                </tr>
                <tr>
                  <td className="p-2"><code>output-type</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2">pdf</td>
                  <td className="p-2">"pdf" or "screenshot"</td>
                </tr>
                <tr>
                  <td className="p-2"><code>pdf-format</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2">A4</td>
                  <td className="p-2">A4, Letter, Legal, etc.</td>
                </tr>
                <tr>
                  <td className="p-2"><code>pdf-margin-*</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2">50px</td>
                  <td className="p-2">Margins (top, right, bottom, left)</td>
                </tr>
                <tr>
                  <td className="p-2"><code>form-factor</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2">desktop</td>
                  <td className="p-2">"desktop" or "mobile"</td>
                </tr>
                <tr>
                  <td className="p-2"><code>screenshot-type</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2">png</td>
                  <td className="p-2">"png", "jpeg", or "webp"</td>
                </tr>
                <tr>
                  <td className="p-2"><code>screenshot-quality</code></td>
                  <td className="p-2">number</td>
                  <td className="p-2">90</td>
                  <td className="p-2">1-100 (for JPEG)</td>
                </tr>
                <tr>
                  <td className="p-2"><code>button-text</code></td>
                  <td className="p-2">string</td>
                  <td className="p-2">Generate PDF</td>
                  <td className="p-2">Custom button label</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Can I customize the button styling?</h3>
            <p className="text-muted-foreground">
              The widget uses shadow DOM for style isolation. You can customize the button text,
              but custom CSS requires accessing the shadow root. We're working on more customization options.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Does this work with single-page applications?</h3>
            <p className="text-muted-foreground">
              Yes! The widget works with React, Vue, Angular, and other SPAs. Just include the script
              and use the custom element like any other HTML tag.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How do I test locally?</h3>
            <p className="text-muted-foreground">
              Add <code>localhost:*</code> to your authorized domains list. This allows the widget
              to work on any localhost port during development.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What happens if I exceed my credit limit?</h3>
            <p className="text-muted-foreground">
              Widget requests will fail with an error message. Users will see an error notification
              in the widget. Upgrade your plan for more credits or wait until your monthly limit resets.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Can I track widget usage?</h3>
            <p className="text-muted-foreground">
              Yes, all widget requests appear in your dashboard usage statistics, including the
              last time each public key was used.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to get started?</h2>
            <p className="text-primary-foreground/90">
              Create your free account and add the widget to your site in minutes
            </p>
            <Button size="lg" variant="secondary" onClick={onGetStarted}>
              Get Started Free
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



