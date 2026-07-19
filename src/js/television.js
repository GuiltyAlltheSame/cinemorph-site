/**
 * Television feature: power UI, decorative audio, responsive state, and VCR clock.
 */

import {
  dom,
  isMobileScene,
  mobileSceneQuery
} from "./core.js";

const {
  scene,
  tvContent,
  tvNoise,
  tvPowerClick,
  tvPowerButton,
  tvBloom,
  vcrClock,
  vcrClockHours,
  vcrClockMinutes,
  vcrClockStatus
} = dom;

let televisionController = null;

// TV power, noise, and responsive state --------------------------------------

/**
 * Initializes TV power, white noise, responsive TV state, and the VCR display.
 * VHS is injected as a controller to avoid a circular module dependency.
 */
export const initTelevision = ({ vhsController = null } = {}) => {
  if (televisionController) return televisionController;

  let tvNoiseController = null;
  let tvPowerController = null;
  let setVcrDisplayMode = () => {};
  let getVcrDisplayMode = () => "clock";

  if (tvContent && tvNoise && tvPowerButton && tvBloom) {
    const maxNoiseVolume = 0.01;
    const tvBootDuration = 2600;
    const tvShutdownDuration = 420;
    // on/off button sound: 1 = original, 1.35 = faster, 0.8 = slower.
    const tvPowerClickPlaybackRate = 4;

    let noiseFadeFrame;
    let tvShutdownTimer;
    let noiseStarted = false;
    let targetNoiseVolume = 0;
    let tvPoweredOn = false;

    /** Prevents decorative TV audio from playing in the native mobile layout. */
    const syncMobileAudioMute = () => {
      const muted = isMobileScene();

      tvNoise.muted = muted;

      if (tvPowerClick) {
        tvPowerClick.muted = muted;
      }

      if (!muted) return;

      window.cancelAnimationFrame(noiseFadeFrame);
      noiseFadeFrame = null;
      noiseStarted = false;
      targetNoiseVolume = 0;
      tvNoise.volume = 0;
      tvNoise.pause();

      if (tvPowerClick) {
        tvPowerClick.pause();
        tvPowerClick.currentTime = 0;
      }
    };

    /** Fades white noise with a soft ease-out and pauses it at zero volume. */
    const fadeNoiseTo = (targetVolume, duration = 900) => {
      if (targetNoiseVolume === targetVolume) return;

      targetNoiseVolume = targetVolume;
      window.cancelAnimationFrame(noiseFadeFrame);

      const startVolume = tvNoise.volume;
      const volumeDelta = targetVolume - startVolume;
      const startTime = performance.now();

      /** Advances one eased volume-animation frame. */
      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        tvNoise.volume = startVolume + volumeDelta * easedProgress;

        if (progress < 1) {
          noiseFadeFrame = window.requestAnimationFrame(tick);
        } else if (targetVolume === 0) {
          noiseFadeFrame = null;
          tvNoise.pause();
        } else {
          noiseFadeFrame = null;
        }
      };

      noiseFadeFrame = window.requestAnimationFrame(tick);
    };

    /** Starts white noise after a permitted user gesture and applies boot fade timing. */
    const startNoise = async () => {
      if (isMobileScene() || !tvPoweredOn) return;

      if (!noiseStarted) {
        tvNoise.volume = 0;
      }

      try {
        await tvNoise.play();
        noiseStarted = true;

        if (window.scrollY <= 2) {
          fadeNoiseTo(maxNoiseVolume, tvBootDuration);
        }
      } catch {
        // Browsers may block sound until the first explicit user gesture.
      }
    };

    /** Restarts the physical TV power click for each accepted button press. */
    const playPowerClick = () => {
      if (isMobileScene() || !tvPowerClick) return;

      tvPowerClick.pause();
      tvPowerClick.currentTime = 0;
      tvPowerClick.playbackRate = tvPowerClickPlaybackRate;
      tvPowerClick.play().catch(() => {});
    };

    /** Powers the TV UI on and optionally starts its decorative audio. */
    const powerOnTv = ({ startAudio = true } = {}) => {
      window.clearTimeout(tvShutdownTimer);
      tvPoweredOn = true;
      tvContent.classList.remove("is-switching-off");
      tvContent.classList.add("is-on");
      tvBloom.classList.add("is-on");
      tvPowerButton.classList.add("is-on");
      tvPowerButton.setAttribute("aria-label", "Turn TV off");
      tvPowerButton.setAttribute("aria-pressed", "true");

      if (startAudio) {
        startNoise();
      }
    };

    /** Powers the desktop TV off and resets any inserted VHS playback. */
    const powerOffTv = () => {
      if (isMobileScene()) {
        powerOnTv({ startAudio: false });
        tvPowerButton.setAttribute("aria-label", "TV is on");
        return;
      }

      window.clearTimeout(tvShutdownTimer);
      tvPoweredOn = false;
      vhsController?.reset?.();
      tvContent.classList.add("is-switching-off");
      tvContent.classList.remove("is-on");
      tvBloom.classList.remove("is-on");
      tvPowerButton.classList.remove("is-on");
      tvPowerButton.setAttribute("aria-label", "Turn TV on");
      tvPowerButton.setAttribute("aria-pressed", "false");

      if (noiseStarted) {
        fadeNoiseTo(0);
      }

      tvShutdownTimer = window.setTimeout(() => {
        tvContent.classList.remove("is-switching-off");
      }, tvShutdownDuration);
    };

    tvPowerButton.addEventListener("click", () => {
      playPowerClick();

      if (isMobileScene()) {
        powerOnTv({ startAudio: false });
        tvPowerButton.setAttribute("aria-label", "TV is on");
        return;
      }

      if (tvPoweredOn) {
        powerOffTv();
        return;
      }

      powerOnTv();
    });

    // Navigation and VHS receive only these media capabilities, not TV internals.
    tvNoiseController = {
      fadeIn: () => {
        if (isMobileScene() || !tvPoweredOn || vhsController?.isVideoPlaying?.()) return;

        if (!noiseStarted) {
          startNoise();
          return;
        }

        if (tvNoise.paused) {
          tvNoise.play().then(() => fadeNoiseTo(maxNoiseVolume)).catch(() => {});
          return;
        }

        fadeNoiseTo(maxNoiseVolume);
      },
      fadeOut: () => {
        if (tvPoweredOn && noiseStarted) {
          fadeNoiseTo(0);
        }
      },
      silence: () => {
        window.cancelAnimationFrame(noiseFadeFrame);
        noiseFadeFrame = null;
        targetNoiseVolume = 0;
        noiseStarted = false;
        tvNoise.volume = 0;
        tvNoise.pause();
      }
    };

    tvPowerController = {
      powerOn: powerOnTv,
      powerOff: powerOffTv,
      isOn: () => tvPoweredOn
    };

    /** Reconciles desktop power controls with the always-on mobile presentation. */
    const syncMobileTvState = () => {
      syncMobileAudioMute();
      scene?.classList.toggle("is-mobile-scene", isMobileScene());

      if (!isMobileScene()) {
        tvPowerButton.setAttribute("aria-label", tvPoweredOn ? "Turn TV off" : "Turn TV on");
        return;
      }

      vhsController?.closeMenu?.();
      vhsController?.reset?.();
      powerOnTv({ startAudio: false });
      tvPowerButton.setAttribute("aria-label", "TV is on");
    };

    syncMobileTvState();

    if (typeof mobileSceneQuery.addEventListener === "function") {
      mobileSceneQuery.addEventListener("change", syncMobileTvState);
    } else {
      mobileSceneQuery.addListener(syncMobileTvState);
    }
  }

  // VCR clock and playback status --------------------------------------------

  if (vcrClock && vcrClockHours && vcrClockMinutes && vcrClockStatus) {
    let vcrDisplayMode = "clock";
    let currentClockLabel = "VCR clock";

    /** Switches the VCR display between clock, READY, and PLAY states. */
    setVcrDisplayMode = (mode = "clock") => {
      const nextMode = ["clock", "ready", "play"].includes(mode) ? mode : "clock";
      const statusText = nextMode === "ready" ? "READY" : "PLAY";

      vcrDisplayMode = nextMode;
      vcrClock.classList.toggle("is-status", nextMode !== "clock");
      vcrClockStatus.textContent = nextMode === "clock" ? "" : statusText;
      vcrClockStatus.setAttribute("aria-hidden", String(nextMode === "clock"));
      vcrClock.setAttribute("aria-label", nextMode === "clock" ? currentClockLabel : `VCR ${statusText}`);
    };

    getVcrDisplayMode = () => vcrDisplayMode;

    /** Refreshes the visible 12-hour clock and its accessible label. */
    const updateVcrClock = () => {
      const now = new Date();
      const hours = now.getHours() % 12 || 12;
      const minutes = now.getMinutes();
      const displayTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

      vcrClockHours.textContent = String(hours).padStart(2, "0");
      vcrClockMinutes.textContent = String(minutes).padStart(2, "0");
      currentClockLabel = `VCR clock ${displayTime}`;

      if (vcrDisplayMode === "clock") {
        vcrClock.setAttribute("aria-label", currentClockLabel);
      }
    };

    updateVcrClock();
    setVcrDisplayMode("clock");
    window.setInterval(updateVcrClock, 1000);
  }

  // Public controller ---------------------------------------------------------

  televisionController = {
    getNoiseController: () => tvNoiseController,
    getPowerController: () => tvPowerController,
    setVcrDisplayMode: (mode) => setVcrDisplayMode(mode),
    getVcrDisplayMode: () => getVcrDisplayMode()
  };

  return televisionController;
};
