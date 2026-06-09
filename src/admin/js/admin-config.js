window.CINEMORPH_ADMIN_CONFIG = {
  authEnabled: true,
  supabase: {
    url: "https://gsqygdhccdnbsvmoropk.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzcXlnZGhjY2RuYnN2bW9yb3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTE4OTQsImV4cCI6MjA5NjI2Nzg5NH0.NtjPCpVzcVXLvbsUwbrN83o5Pzvms_SbYFn_1XD7bQE",
    tables: {
      messages: "messages",
      gallery: "gallery_items",
      videos: "portfolio_videos"
    },
    storage: {
      galleryBucket: "cinemorph-gallery",
      videoBucket: "cinemorph-video-media"
    }
  },
  posterGeneration: {
    endpoint: "/.netlify/functions/generate-vimeo-poster"
  }
};
