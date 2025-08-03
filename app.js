
let lyrics = [];
let currentLine = 0;
let timer = null;
let interval = 3000;
let syncMode = false;
let threshold = 20;
let audioContext, analyser, microphone, dataArray;

const lyricsEl = document.getElementById("lyrics");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const scanAgainBtn = document.getElementById("scanAgainBtn");
const adjustBtn = document.getElementById("adjustBtn");
const syncBtn = document.getElementById("syncBtn");
const micPermissionMsg = document.getElementById("micPermissionMsg");
const micStatusMsg = document.getElementById("micStatusMsg");
const thresholdSlider = document.getElementById("thresholdSlider");
const thresholdValue = document.getElementById("thresholdValue");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const themeToggle = document.getElementById("themeToggle");
const beatIndicator = document.getElementById("beatIndicator");

let html5QrCode;
let silenceTimer;

function startQRScanner() {
  html5QrCode = new Html5Qrcode("reader");
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
  if (url.includes("github.com") && url.includes("/blob/")) {
    return url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  }
  if (url.includes("gitlab.com") && url.includes("/-/blob/")) {
    return url.replace("/-/blob/", "/-/raw/");
  }
  if (url.includes("bitbucket.org") && url.includes("/src/")) {
    return url.replace("/src/", "/raw/");
  }
  if (url.includes("dropbox.com") && url.includes("?dl=0")) {
    return url.replace("?dl=0", "?dl=1");
  }
  if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (fileIdMatch) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}`;
    }
  }
  if (url.includes("1drv.ms")) {
    return url.replace("1drv.ms", "onedrive.live.com/download");
  }
  return url;
}

async function loadLyrics(url) {
  try {
    const normalizedUrl = normalizeUrl(url);
    const res = await fetch(normalizedUrl);
    if (!res.ok) throw new Error("Erro ao carregar");
    const text = await res.text();
    lyrics = text.split("\n").filter(line => line.trim() !== "");
    currentLine = 0;
    restartBtn.style.display = "none";
    scanAgainBtn.style.display = "none";
    renderLyrics();
  } catch (err) {
    lyricsEl.textContent = "❌ Não foi possível carregar a letra.";
    scanAgainBtn.style.display = "inline-block";
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
      setTimeout(() => div.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
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
    playPauseBtn.textContent = "▶️";
  } else {
    timer = setInterval(nextLine, interval);
    playPauseBtn.textContent = "⏸";
  }
}

function nextLine() {
  if (currentLine < lyrics.length - 1) {
    currentLine++;
    renderLyrics();
  } else {
    clearInterval(timer);
    timer = null;
    playPauseBtn.textContent = "▶️";
    restartBtn.style.display = "inline-block";
    scanAgainBtn.style.display = "inline-block";
  }
}

function restartLyrics() {
  currentLine = 0;
  restartBtn.style.display = "none";
  renderLyrics();
}

function scanAgain() {
  lyricsEl.innerHTML = "";
  restartBtn.style.display = "none";
  scanAgainBtn.style.display = "none";
  startQRScanner();
}

function activateSync() {
  if (!syncMode) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume().then(() => {
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        detectBeats();
        syncMode = true;
        syncBtn.textContent = "🎤 Sync On";
        micPermissionMsg.style.display = "none";
      });
    }).catch(err => {
      micPermissionMsg.textContent = "❌ Permissão ao microfone negada.";
      micPermissionMsg.style.color = "red";
    });
  } else {
    syncMode = false;
    syncBtn.textContent = "🎤 Sync Off";
    micPermissionMsg.style.display = "block";
    micStatusMsg.textContent = "⚠️ Microfone inativo";
  }
}

function detectBeats() {
  if (!syncMode) return;
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += Math.abs(dataArray[i] - 128);
  }
  let volume = sum / dataArray.length;

  if (volume > threshold) {
    beatIndicator.classList.add("active");
    setTimeout(() => beatIndicator.classList.remove("active"), 100);
    micStatusMsg.textContent = "🎤 Captando áudio...";
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      micStatusMsg.textContent = "🔇 Sem som detectado";
    }, 1500);
    nextLine();
    setTimeout(detectBeats, 1000);
  } else {
    requestAnimationFrame(detectBeats);
  }
}

thresholdSlider.addEventListener("input", () => {
  threshold = parseInt(thresholdSlider.value);
  thresholdValue.textContent = threshold;
});

adjustBtn.addEventListener("click", () => nextLine());
syncBtn.addEventListener("click", activateSync);

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
scanAgainBtn.addEventListener("click", scanAgain);

themeToggle.addEventListener("click", () => {
  if (document.body.dataset.theme === "light") {
    document.body.dataset.theme = "dark";
    document.documentElement.style.setProperty("--bg-color", "#111");
    document.documentElement.style.setProperty("--text-color", "#fff");
  } else {
    document.body.dataset.theme = "light";
    document.documentElement.style.setProperty("--bg-color", "#f5f5f5");
    document.documentElement.style.setProperty("--text-color", "#000");
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
