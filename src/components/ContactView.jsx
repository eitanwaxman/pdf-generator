import { Button } from './ui/button'
import Footer from './Footer'

export default function ContactView({ isLoggedIn, onGoToDashboard, onBackToHome, onViewContact }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={onBackToHome} className="hover:bg-accent/50 transition-colors">
            ← Back to Home
          </Button>
          {isLoggedIn && (
            <Button variant="outline" onClick={onGoToDashboard} className="hover:bg-accent/50 transition-colors">
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Contact Us
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Have a question or need help? We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.
          </p>
        </div>

        {/* Embedded Google Form */}
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSdvpfMRi1JzjOl3LnT_nyEVFjKWwMnOjT2FsDiPbc0C0OuNGg/viewform?embedded=true"
              width="100%"
              height="688"
              frameBorder="0"
              marginHeight="0"
              marginWidth="0"
              className="w-full min-h-[688px]"
              title="Contact Us Form"
            >
              Loading…
            </iframe>
          </div>
        </div>
        <Footer onViewContact={onViewContact} />
      </div>
    </div>
  )
}

