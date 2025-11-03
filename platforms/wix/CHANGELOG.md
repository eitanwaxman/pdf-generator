# Changelog

All notable changes to the Wix PDF Generator Widget will be documented in this file.

## [1.0.0] - 2024-11-03

### Added
- Initial release of Wix PDF Generator Widget
- React-based custom element button
- Settings panel with full API configuration
- Backend integration with Wix Secrets Manager
- Support for all PDF API options (format, margins, viewport, etc.)
- Screenshot generation support
- Platform-specific optimizations
- Query parameter support
- Automatic PDF download to user's device

### Changed
- Removed Media Manager upload feature (not supported in frontend custom elements)
- Simplified widget to use direct PDF downloads instead

### Technical Details
- Custom element registration with shadow DOM
- PostMessage communication between settings panel and widget
- Webpack build configuration for production deployment
- Express backend router for API key management
- CORS configuration for Wix domains

### Deployment
- Automatic build on Render.com deployment
- Static file serving integrated with main Express app
- Backend endpoint mounted at `/wix/api/generate-pdf`

### Documentation
- Complete deployment guide for Render.com
- Testing checklist with troubleshooting
- Getting started guide
- API reference

