import { useEffect } from 'react'

/**
 * SEO Component - Manages meta tags, title, and Open Graph tags
 * Works without react-helmet by directly manipulating the DOM
 */
export default function SEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
  nofollow = false,
}) {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title
    }

    // Helper function to update or create meta tag
    const updateMetaTag = (name, content, attribute = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, name)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // Update or create meta tags
    if (description) {
      updateMetaTag('description', description)
      updateMetaTag('og:description', description, 'property')
      updateMetaTag('twitter:description', description)
    }

    if (keywords) {
      updateMetaTag('keywords', keywords)
    }

    // Open Graph tags
    if (title) {
      updateMetaTag('og:title', title, 'property')
      updateMetaTag('twitter:title', title)
    }

    updateMetaTag('og:type', ogType, 'property')
    updateMetaTag('twitter:card', 'summary_large_image')

    if (ogImage) {
      updateMetaTag('og:image', ogImage, 'property')
      updateMetaTag('twitter:image', ogImage)
    }

    // Canonical URL
    if (canonical) {
      let canonicalLink = document.querySelector('link[rel="canonical"]')
      if (!canonicalLink) {
        canonicalLink = document.createElement('link')
        canonicalLink.setAttribute('rel', 'canonical')
        document.head.appendChild(canonicalLink)
      }
      canonicalLink.setAttribute('href', canonical)
    }

    // Robots meta tag
    if (noindex || nofollow) {
      const robotsContent = [noindex ? 'noindex' : '', nofollow ? 'nofollow' : '']
        .filter(Boolean)
        .join(', ')
      updateMetaTag('robots', robotsContent)
    } else {
      // Remove robots meta tag if it exists
      const robotsTag = document.querySelector('meta[name="robots"]')
      if (robotsTag) {
        robotsTag.remove()
      }
    }

    // Cleanup function (optional - meta tags persist, but we could remove them)
    return () => {
      // Meta tags typically persist, but we could clean up if needed
    }
  }, [title, description, keywords, canonical, ogImage, ogType, noindex, nofollow])

  return null // This component doesn't render anything
}

