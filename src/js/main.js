const vhsTrigger = document.querySelector(".hotspot-vhs");
const vhsMenu = document.querySelector("#vhsMenu");
const scene = document.querySelector(".main-area");
const content = document.querySelector("main");
const sceneLoader = document.querySelector("#sceneLoader");
const loaderSegments = [...document.querySelectorAll(".scene-loader__segment")];
const sceneReturn = document.querySelector("#sceneReturn");
const tvContent = document.querySelector(".tv-content");
const tvNoise = document.querySelector("#tvNoise");
const tvPowerButton = document.querySelector(".hotspot-tv-power");
const tvBloom = document.querySelector(".tv-bloom");
let tvNoiseController;

if (tvContent && tvNoise && tvPowerButton && tvBloom) {
  const maxNoiseVolume = 0.01;
  const tvBootDuration = 2600;
  let noiseFadeFrame;
  let noiseStarted = false;
  let targetNoiseVolume = 0;
  let tvPoweredOn = false;

  const fadeNoiseTo = (targetVolume, duration = 900) => {
    if (targetNoiseVolume === targetVolume) return;

    targetNoiseVolume = targetVolume;
    window.cancelAnimationFrame(noiseFadeFrame);

    const startVolume = tvNoise.volume;
    const volumeDelta = targetVolume - startVolume;
    const startTime = performance.now();

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

  const startNoise = async () => {
    if (!tvPoweredOn) return;

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
      // Autoplay with sound is often blocked until the first user gesture.
    }
  };

  const powerOnTv = () => {
    tvPoweredOn = true;
    tvContent.classList.add("is-on");
    tvBloom.classList.add("is-on");
    tvPowerButton.classList.add("is-on");
    tvPowerButton.setAttribute("aria-label", "Выключить телевизор");
    tvPowerButton.setAttribute("aria-pressed", "true");
    startNoise();
  };

  const powerOffTv = () => {
    tvPoweredOn = false;
    tvContent.classList.remove("is-on");
    tvBloom.classList.remove("is-on");
    tvPowerButton.classList.remove("is-on");
    tvPowerButton.setAttribute("aria-label", "Включить телевизор");
    tvPowerButton.setAttribute("aria-pressed", "false");

    if (noiseStarted) {
      fadeNoiseTo(0);
    }
  };

  tvPowerButton.addEventListener("click", () => {
    if (tvPoweredOn) {
      powerOffTv();
      return;
    }

    powerOnTv();
  });

  tvNoiseController = {
    fadeIn: () => {
      if (!tvPoweredOn) return;

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
  };
}

if (vhsTrigger && vhsMenu) {
  const openVhsMenu = () => {
    vhsMenu.classList.add("is-open");
    vhsMenu.setAttribute("aria-hidden", "false");
    vhsTrigger.setAttribute("aria-expanded", "true");
  };

  const closeVhsMenu = () => {
    vhsMenu.classList.remove("is-open");
    vhsMenu.setAttribute("aria-hidden", "true");
    vhsTrigger.setAttribute("aria-expanded", "false");
  };

  vhsTrigger.addEventListener("click", () => {
    if (vhsMenu.classList.contains("is-open")) {
      closeVhsMenu();
      return;
    }

    openVhsMenu();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!vhsMenu.classList.contains("is-open")) return;
    if (vhsMenu.contains(event.target) || vhsTrigger.contains(event.target)) return;

    closeVhsMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeVhsMenu();
    }
  });
}

if (scene && content && sceneLoader && loaderSegments.length && sceneReturn) {
  const pullThreshold = 900;
  const returnThreshold = 260;
  const resetDelay = 520;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let scenePull = 0;
  let returnPull = 0;
  let resetTimer;
  let isTransitioning = false;

  const contentTop = () => content.offsetTop;
  const isAtScene = () => window.scrollY <= 2;
  const isAtContentTop = () => Math.abs(window.scrollY - contentTop()) <= 3;
  const isInContent = () => window.scrollY >= contentTop() - 3;

  const fillLoader = (progress) => {
    const filledSegments = Math.ceil(progress * loaderSegments.length);

    loaderSegments.forEach((segment, index) => {
      segment.classList.toggle("is-filled", index < filledSegments);
    });

    sceneLoader.classList.toggle("is-visible", progress > 0);
  };

  const resetPulls = () => {
    scenePull = 0;
    returnPull = 0;
    fillLoader(0);
    sceneReturn.classList.remove("is-pulling");
  };

  const queueReset = () => {
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(resetPulls, resetDelay);
  };

  const updateReturnArrow = () => {
    sceneReturn.classList.toggle("is-visible", isInContent());
  };

  const jumpToContent = () => {
    isTransitioning = true;
    scenePull = pullThreshold;
    fillLoader(1);
    window.clearTimeout(resetTimer);
    tvNoiseController?.fadeOut();

    window.scrollTo({
      top: contentTop(),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    window.setTimeout(() => {
      resetPulls();
      updateReturnArrow();
      isTransitioning = false;
    }, prefersReducedMotion ? 0 : 620);
  };

  const jumpToScene = () => {
    isTransitioning = true;
    returnPull = returnThreshold;
    window.clearTimeout(resetTimer);

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    window.setTimeout(() => {
      resetPulls();
      updateReturnArrow();
      tvNoiseController?.fadeIn();
      isTransitioning = false;
    }, prefersReducedMotion ? 0 : 620);
  };

  window.addEventListener(
    "wheel",
    (event) => {
      if (isTransitioning) {
        event.preventDefault();
        return;
      }

      if (isAtScene() && event.deltaY > 0) {
        event.preventDefault();
        scenePull = Math.min(scenePull + event.deltaY, pullThreshold);
        fillLoader(scenePull / pullThreshold);
        queueReset();

        if (scenePull >= pullThreshold) {
          jumpToContent();
        }

        return;
      }

      if (isAtScene() && event.deltaY < 0 && scenePull > 0) {
        event.preventDefault();
        scenePull = Math.max(scenePull + event.deltaY, 0);
        fillLoader(scenePull / pullThreshold);
        queueReset();
        return;
      }

      if (isAtContentTop() && event.deltaY < 0) {
        event.preventDefault();
        returnPull = Math.min(returnPull + Math.abs(event.deltaY), returnThreshold);
        sceneReturn.classList.add("is-pulling");
        queueReset();

        if (returnPull >= returnThreshold) {
          jumpToScene();
        }
      }
    },
    { passive: false }
  );

  window.addEventListener(
    "scroll",
    () => {
      updateReturnArrow();

      if (isInContent()) {
        tvNoiseController?.fadeOut();
      } else if (isAtScene()) {
        tvNoiseController?.fadeIn();
      }
    },
    { passive: true }
  );

  sceneReturn.addEventListener("click", () => {
    if (!isTransitioning) {
      jumpToScene();
    }
  });

  updateReturnArrow();
}
