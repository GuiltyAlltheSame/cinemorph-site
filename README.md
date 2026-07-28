# Cinemorph Studio

A custom portfolio website created for Cinemorph Studio — a cinematic
storytelling and production team based in Vancouver, Washington.

[Visit the live website](https://cinemorphstudio.com/)

## About the Project

Cinemorph Studio needed more than a traditional production portfolio. The
website was designed as an interactive visual experience inspired by analog
television, VHS tapes, film equipment, and late-night editing rooms.

The result combines a cinematic presentation with a practical content system.
Visitors can explore the studio, watch selected projects, browse stills, learn
about production services, and contact the team. Studio administrators can
manage the portfolio and incoming enquiries through a protected dashboard.

## Public Website

### Interactive TV and VHS Experience

- Custom television scene used as the main landing experience
- Working TV power control with visual and audio feedback
- Interactive VHS box with dynamically generated project tapes
- Drag-and-drop cassette insertion
- Vimeo playback directly inside the television
- Animated VCR display, tape states, lighting, and screen effects
- Responsive presentation adapted for desktop and mobile devices

### Video Portfolio

- Supabase-powered portfolio that can be updated without editing the website
- Vimeo integration for reliable high-quality playback
- Poster images and motion previews
- Featured project presentation
- Shared full-screen video player
- VHS labels and cassette artwork generated from project metadata

### Stills Gallery

- Cinematic horizontal gallery layout
- Mouse-wheel, touchpad, touch, and keyboard navigation
- Interactive gallery progress indicator
- Optimized Supabase image delivery
- Full-screen image viewer with previous and next controls
- Configurable image focal points for consistent framing

### Studio Information

- About section and team profiles
- Production services overview
- Direct links to Vimeo, YouTube, Instagram, and other studio channels
- Responsive contact information and developer credit

### Contact Experience

- Custom contact form for production enquiries
- Support for up to five reference links
- Automatic link preview cards inside the administration dashboard
- Honeypot and Cloudflare Turnstile spam protection
- Server-side validation before messages are stored
- Clear submission, loading, and error states

## Administration Dashboard

The website includes a dedicated Supabase-authenticated dashboard that allows
the studio to manage day-to-day content without changing source code.

### Messages

- View all enquiries submitted through the public contact form
- Filter unread, read, and archived messages
- Mark messages as read or unread
- Archive or permanently delete messages
- Detect and preview links included in enquiries
- View live unread-message counters

### Gallery Management

- Upload new gallery images
- Add titles and accessible alternative text
- Preview the final public gallery card before publishing
- Set a custom focal point for each image
- Crop images to the required cinematic 17:9 format
- Reorder gallery items with drag and drop
- Edit or delete existing entries
- Automatically clean up associated Storage files

### Video and Portfolio Management

- Add and edit Vimeo projects
- Upload poster images and GIF or MP4 motion previews
- Generate a poster from a selected Vimeo frame
- Mark a project as featured
- Enable or disable its VHS presentation
- Customize the VHS label and cassette texture
- Reorder portfolio cards and VHS tapes independently
- Preview the public-facing card before publishing
- Remove outdated media files when content is replaced or deleted

### Portfolio Watcher

The built-in Portfolio Watcher highlights incomplete or inconsistent content,
including missing posters, previews, titles, alternative text, or VHS metadata.
This gives administrators a quick overview of anything that needs attention
before new work is published.

### Dashboard Status

- Live counts for videos and gallery images
- Unread enquiry indicator
- Supabase connection status
- Optional link-preview mode
- Responsive layouts for different screen sizes
- Confirmation dialogs for destructive actions
- Non-blocking status and error notifications

## Performance and User Experience

- Modular JavaScript architecture with isolated feature responsibilities
- No heavyweight frontend framework
- Lazy-loaded gallery and portfolio media
- Supabase image transformations for smaller preview requests
- Responsive layouts for desktop, laptop, tablet, and mobile
- Tuned mouse-wheel and touchpad section navigation
- Reduced-motion support
- Keyboard-accessible controls and dialogs
- Clear empty, loading, fallback, and error states

## Security and Data

- Supabase authentication for administration access
- Row Level Security compatible data access
- Server-only privileged Supabase operations
- Cloudflare Turnstile verification for public enquiries
- Server-side form validation
- Controlled Storage uploads and cleanup
- Vimeo poster generation restricted to authenticated administrators

## Technology

- Semantic HTML5
- Custom responsive CSS
- Browser-native JavaScript and ES Modules
- Supabase Auth, Database, and Storage
- Vimeo Player API
- Cloudflare Turnstile
- Netlify Hosting and Netlify Functions
- Node.js
- FFmpeg

## Project Highlights

- Fully custom visual identity rather than a template-based portfolio
- Public content and administration tools built as one connected system
- Interactive VHS concept tied directly to real portfolio data
- Media workflow designed for non-technical content management
- Responsive behavior tailored to both traditional and gesture-based input
- Maintainable modular codebase prepared for future studio content

