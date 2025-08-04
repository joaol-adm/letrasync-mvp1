// v20 - Correções de tema e mensagens
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
const endMsg = document.getElementById("endMsg");
const thresholdSlider = document.getElementById("thresholdSlider");
const speedSlider = document.getElementById("speedSlider");
const volumeMeter = document.getElementById("volumeMeter");
const beatIndicator = document.getElementById("beatIndicator");
const themeToggle = document.getElementById("themeToggle");

let html5QrCode;
let silenceTimer;

function startQRScanner() {
  html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: 250 };
  html5QrCode.start({ facingMode: "environment" }, config, async (decodedText) => {
    html5QrCode.stop();
    endMsg.style.display = "none";
    await loadLyrics(decodedText);
  }, (err) => console.warn(`QR Scan error: ${err}`));
}

function normalizeUrl(url) {
  if (url.includes("github.com") && url.includes("/blob/"))
    return url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  if (url.includes("gitlab.com") && url.includes("/-/blob/"))
    return url.replace("/-/blob/", "/-/raw/");
  if (url.includes("bitbucket.org") && url.includes("/src/"))
    return url.replace("/src/", "/raw/");
  if (url.includes("dropbox.com") && url.includes("?dl=0"))
    return url.replace("?dl=0", "?dl=1");
  if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (fileIdMatch) return `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}`;
  }
  if (url.includes("1drv.ms"))
    return url.replace("1drv.ms", "onedrive.live.com/download");
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
    endMsg.style.display = "none";
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
    div.addEventListener("click", () => { currentLine = index; renderLyrics(); });
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
    endMsg.style.display = "block";
  }
}

function restartLyrics() {
  currentLine = 0;
  restartBtn.style.display = "none";
  endMsg.style.display = "none";
  renderLyrics();
}

function scanAgain() {
  lyricsEl.innerHTML = "";
  restartBtn.style.display = "none";
  scanAgainBtn.style.display = "none";
  endMsg.style.display = "none";
  startQRScanner();
}

function activateSync() {
  if (!syncMode) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume().then(() => {
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        syncMode = true;
        micPermissionMsg.style.display = "none";
        micStatusMsg.textContent = "⏳ Aguardando som...";
        detectBeats(analyser, dataArray);
      });
    }).catch(() => {
      micPermissionMsg.textContent = "❌ Permissão negada.";
      micPermissionMsg.style.color = "red";
    });
  } else {
    syncMode = false;
    micPermissionMsg.style.display = "block";
    micStatusMsg.textContent = "⚠️ Microfone inativo";
    volumeMeter.style.width = "0%";
  }
}

function detectBeats(analyser, dataArray) {
  if (!syncMode) return;
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += Math.abs(dataArray[i] - 128);
  let volume = sum / dataArray.length;
  volumeMeter.style.width = Math.min(100, volume * 5) + "%";
  if (volume > threshold) {
    beatIndicator.classList.add("active");
    setTimeout(() => beatIndicator.classList.remove("active"), 100);
    micStatusMsg.textContent = "🎤 Captando áudio...";
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => { micStatusMsg.textContent = "⏳ Aguardando som..."; }, 1500);
    nextLine();
    setTimeout(() => detectBeats(analyser, dataArray), 1000);
  } else {
    requestAnimationFrame(() => detectBeats(analyser, dataArray));
  }
}

thresholdSlider.addEventListener("input", () => { threshold = parseInt(thresholdSlider.value); });
adjustBtn.addEventListener("click", nextLine);
syncBtn.addEventListener("click", activateSync);
speedSlider.addEventListener("input", () => {
  interval = speedSlider.value * 1000;
  if (timer) { clearInterval(timer); timer = setInterval(nextLine, interval); }
});

playPauseBtn.addEventListener("click", playPause);
nextBtn.addEventListener("click", nextLine);
restartBtn.addEventListener("click", restartLyrics);
scanAgainBtn.addEventListener("click", scanAgain);

themeToggle.addEventListener("click", () => {
  const body = document.body;
  const currentTheme = body.getAttribute("data-theme");
  body.setAttribute("data-theme", currentTheme === "light" ? "dark" : "light");
});

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  startQRScanner();
});