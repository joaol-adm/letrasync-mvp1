
let lyrics = [];
let currentLine = 0;
let timer = null;
let interval = 3000;
const lyricsEl = document.getElementById("lyrics");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");

function startQRScanner() {
  const html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: 250 };
  html5QrCode.start(
    { facingMode: "environment" },
    config,
    async (decodedText) => {
      html5QrCode.stop();
      await loadLyrics(decodedText);
    },
    (err) => {
      console.warn(`QR Scan error: ${err}`);
    }
  );
}

function normalizeUrl(url) {
  // GitHub
  if (url.includes("github.com") && url.includes("/blob/")) {
    return url
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
  }
  // GitLab
  if (url.includes("gitlab.com") && url.includes("/-/blob/")) {
    return url
      .replace("/-/blob/", "/-/raw/");
  }
  // Bitbucket
  if (url.includes("bitbucket.org") && url.includes("/src/")) {
    return url.replace("/src/", "/raw/");
  }
  // Dropbox
  if (url.includes("dropbox.com") && url.includes("?dl=0")) {
    return url.replace("?dl=0", "?dl=1");
  }
  // Google Drive
  if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (fileIdMatch) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}`;
    }
  }
  return url;
}

async function loadLyrics(url) {
  try {
    const normalizedUrl = normalizeUrl(url);
    console.log("🔄 URL normalizada:", normalizedUrl);

    const res = await fetch(normalizedUrl);
    if (!res.ok) throw new Error("Erro ao carregar");
    const text = await res.text();
    lyrics = text.split("\n").filter(line => line.trim() !== "");
    currentLine = 0;
    restartBtn.style.display = "none";
    renderLyrics();
  } catch (err) {
    lyricsEl.textContent = "❌ Não foi possível carregar a letra.";
    console.error(err);
  }
}

function renderLyrics() {
  lyricsEl.innerHTML = "";
  lyrics.forEach((line, index) => {
    const div = document.createElement("div");
    div.textContent = line;
    div.classList.add("line");
    if (index === currentLine) {
      div.classList.add("current");
      setTimeout(() => {
        div.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
    div.addEventListener("click", () => {
      currentLine = index;
      renderLyrics();
    });
    lyricsEl.appendChild(div);
  });
}

function playPause() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    playPauseBtn.textContent = "▶️ Play";
  } else {
    timer = setInterval(nextLine, interval);
    playPauseBtn.textContent = "⏸ Pause";
  }
}

function nextLine() {
  if (currentLine < lyrics.length - 1) {
    currentLine++;
    renderLyrics();
  } else {
    clearInterval(timer);
    timer = null;
    playPauseBtn.textContent = "▶️ Play";
    restartBtn.style.display = "inline-block";
  }
}

function restartLyrics() {
  currentLine = 0;
  restartBtn.style.display = "none";
  renderLyrics();
}

speedSlider.addEventListener("input", () => {
  interval = speedSlider.value * 1000;
  speedValue.textContent = speedSlider.value + "s";
  if (timer) {
    clearInterval(timer);
    timer = setInterval(nextLine, interval);
  }
});

playPauseBtn.addEventListener("click", playPause);
nextBtn.addEventListener("click", nextLine);
restartBtn.addEventListener("click", restartLyrics);

// Atalhos de teclado
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    playPause();
  } else if (e.code === "ArrowRight") {
    nextLine();
  } else if (e.code === "ArrowLeft") {
    if (currentLine > 0) {
      currentLine--;
      renderLyrics();
    }
  } else if (e.code === "ArrowUp") {
    speedSlider.value = Math.max(1, parseInt(speedSlider.value) - 1);
    speedSlider.dispatchEvent(new Event("input"));
  } else if (e.code === "ArrowDown") {
    speedSlider.value = Math.min(10, parseInt(speedSlider.value) + 1);
    speedSlider.dispatchEvent(new Event("input"));
  }
});

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => {
      console.log("✅ Service Worker registrado!");
    });
  }
  startQRScanner();
});
