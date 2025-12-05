import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Check, Download, Settings, Zap, Shield, FileText, Smartphone, Monitor } from 'lucide-react'

export default function WixLandingView({ onGetStarted, onViewDocs }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white">
        <div className="container max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
              Wix App Market
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              PDF Generator for Wix
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-blue-100">
              Add PDF & Screenshot Generation to Your Wix Site
            </h2>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8">
              Let your visitors convert any page to PDF or take screenshots with a single click. 
              No coding required. Fully customizable.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-8 py-6 h-auto"
                onClick={() => window.open('https://wix.to/MMv9cAJ', '_blank')}
              >
                <Download className="mr-2 h-5 w-5" />
                Install from Wix App Market
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-6 h-auto"
                onClick={onViewDocs}
              >
                View Documentation
              </Button>
            </div>
            <p className="text-sm text-blue-200 mt-4">
              Free to install • No credit card required
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need in One Widget
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful PDF generation features designed specifically for Wix websites
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">PDF Generation</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Convert any page to PDF with customizable formats (A4, Letter, Legal, and more) 
                and adjustable margins. Perfect for invoices, reports, and documents.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg">Screenshot Capture</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Take high-quality screenshots in PNG, JPEG, or WebP formats. 
                Full-page or viewport capture with quality controls.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Monitor className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg">Desktop & Mobile</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate PDFs optimized for desktop or mobile viewports. 
                Custom viewport sizes supported for precise rendering.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Settings className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-lg">Easy Configuration</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Visual settings panel in Wix Editor. Configure formats, margins, 
                button text, and more without touching code.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Zap className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-lg">Fast & Reliable</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Powered by DocuSkribe's robust infrastructure. Queue-backed processing 
                ensures fast, reliable PDF generation every time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-lg">Secure & Private</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Your API keys are secure. PDFs are generated server-side and delivered 
                directly to users. No data stored permanently.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Use Cases */}
        <div className="bg-muted rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Perfect For</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">E-commerce Sites</h4>
                <p className="text-sm text-muted-foreground">
                  Let customers download invoices, receipts, and order confirmations as PDFs
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Portfolio Websites</h4>
                <p className="text-sm text-muted-foreground">
                  Allow visitors to download your portfolio or case studies as PDFs
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Business Websites</h4>
                <p className="text-sm text-muted-foreground">
                  Generate PDFs of proposals, quotes, and business documents on demand
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Blogs & Content Sites</h4>
                <p className="text-sm text-muted-foreground">
                  Let readers save articles, guides, and tutorials as PDFs for offline reading
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Service Providers</h4>
                <p className="text-sm text-muted-foreground">
                  Generate service agreements, contracts, and reports as downloadable PDFs
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Educational Sites</h4>
                <p className="text-sm text-muted-foreground">
                  Enable students to download course materials, certificates, and resources
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Install the App</h3>
              <p className="text-sm text-muted-foreground">
                Add the PDF Generator app from the Wix App Market to your site. 
                It's free to install and takes just seconds.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Get Your API Key</h3>
              <p className="text-sm text-muted-foreground">
                Sign up for a free DocuSkribe account and get your public API key. 
                Add it to the widget settings in Wix Editor.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Customize & Publish</h3>
              <p className="text-sm text-muted-foreground">
                Configure the button text, PDF format, and other settings in the 
                visual editor. Publish your site and you're done!
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Add PDF Generation to Your Wix Site?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of Wix site owners who are using PDF Generator to enhance their websites
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-8 py-6 h-auto"
              onClick={() => window.open('https://wix.to/MMv9cAJ', '_blank')}
            >
              <Download className="mr-2 h-5 w-5" />
              Install Now - It's Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-6 h-auto"
              onClick={onViewDocs}
            >
              Read Setup Guide
            </Button>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold mb-4">Need Help?</h3>
          <p className="text-muted-foreground mb-4">
            Check out our comprehensive documentation or contact support
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="outline" onClick={onViewDocs}>
              View Documentation
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('https://www.docuskribe.com/dashboard', '_blank')}
            >
              Get Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

