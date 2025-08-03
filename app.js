
let lyrics = [];
let currentLine = 0;
let timer = null;
let interval = 3000;
const lyricsEl = document.getElementById("lyrics");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
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

async function loadLyrics(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro ao carregar");
    const text = await res.text();
    lyrics = text.split("\n").filter(line => line.trim() !== "");
    currentLine = 0;
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
    }
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
  }
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

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => {
      console.log("✅ Service Worker registrado!");
    });
  }
  startQRScanner();
});
