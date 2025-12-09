import { Button } from './ui/button'

export default function Footer({ onViewContact }) {
  return (
    <footer className="border-t mt-16 pt-8 pb-8">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Docuskribe. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {onViewContact && (
              <Button variant="ghost" size="sm" onClick={onViewContact} className="text-muted-foreground hover:text-foreground">
                Contact Us
              </Button>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}

