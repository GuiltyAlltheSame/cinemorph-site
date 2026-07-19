/**
 * Public-site composition root. Feature behavior lives in dedicated modules;
 * this file only initializes them and routes shared data/controllers.
 */

import { dom, initCore } from "./core.js";
import { loadPublicMedia } from "./api.js";
import { initContact } from "./contact.js";
import {
  initGallery,
  isGalleryModalOpen,
  renderGallery,
  setupGalleryScroller
} from "./gallery.js";
import { initNavigation } from "./navigation.js";
import {
  initPortfolio,
  isVideoModalOpen,
  renderPortfolio
} from "./portfolio.js";
import { initTelevision } from "./television.js";
import { initVhsPlayer } from "./vhs-player.js";

let televisionController = null;

// Synchronous feature initialization -----------------------------------------

initCore();

// Contact owns its local state, Turnstile callbacks, and form event handlers.
initContact();

// Gallery owns its renderer, modal, and frame-based desktop scroller.
initGallery();

// Portfolio owns its cards, previews, and the shared Vimeo modal.
initPortfolio({ isGalleryModalOpen });

// VHS exposes a small bridge for TV power, VCR display, and section navigation.
const vhsController = initVhsPlayer({
  getTvNoiseController: () => televisionController?.getNoiseController(),
  getTvPowerController: () => televisionController?.getPowerController(),
  setVcrDisplayMode: (mode) => televisionController?.setVcrDisplayMode(mode),
  getVcrDisplayMode: () => televisionController?.getVcrDisplayMode() || "clock"
});

// Shared public media --------------------------------------------------------

if (dom.galleryStrip || dom.portfolioGrid || dom.vhsMenuContent) {
  loadPublicMedia()
    .then(({ gallery, videos }) => {
      renderGallery(gallery);
      renderPortfolio(videos);
      vhsController.render(videos);
      setupGalleryScroller();
    })
    .catch((error) => {
      console.error("Public media Supabase error:", error);
      renderGallery([]);
      renderPortfolio([]);
      vhsController.render([]);
      setupGalleryScroller();
    });
}

// Cross-feature controllers --------------------------------------------------

// Television owns power, noise, responsive scene state, and the VCR display.
televisionController = initTelevision({ vhsController });

// Navigation receives media capabilities without importing TV/VHS internals.
initNavigation({
  isVideoModalOpen,
  isGalleryModalOpen,
  hasTapeInlinePlayer: vhsController.hasInlinePlayer,
  suspendTapeInlinePlaybackForSection: vhsController.suspendForSection,
  resumeTapeInlinePlaybackForSection: vhsController.resumeForSection,
  getTvNoiseController: televisionController.getNoiseController
});
