let model;
const canvas = document.createElement("canvas");
canvas.width = 280;
canvas.height = 280;
canvas.id = "canvas";
canvas.style.backgroundColor = "black";
document.getElementById("canvas_box").appendChild(canvas);

// Add developer credit footer below canvas
const footer = document.createElement("div");
footer.id = "footer";
footer.style.textAlign = "center";
footer.style.marginTop = "10px";
footer.style.fontSize = "14px";
footer.style.color = "#666";
footer.textContent = "Developed by Metin Meki";
document.getElementById("canvas_box").appendChild(footer);

const ctx = canvas.getContext("2d");
ctx.lineCap = "round";

let drawing = false,
  clickX = [],
  clickY = [],
  clickD = [];

const addGesture = (x, y, drag = false) => {
  clickX.push(x);
  clickY.push(y);
  clickD.push(drag);
};

const drawCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "white";
  ctx.lineJoin = "round";
  ctx.lineWidth = 20;
  for (let i = 0; i < clickX.length; i++) {
    ctx.beginPath();
    if (clickD[i] && i) {
      ctx.moveTo(clickX[i - 1], clickY[i - 1]);
    } else {
      ctx.moveTo(clickX[i] - 1, clickY[i]);
    }
    ctx.lineTo(clickX[i], clickY[i]);
    ctx.stroke();
  }
};

const clearCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  clickX = [];
  clickY = [];
  clickD = [];
  document.getElementById("console-output").innerHTML =
    'Prediction: <span class="digit">?</span>';
  document.getElementById("progress-bars").innerHTML = "";
};

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  addGesture(e.clientX - rect.left, e.clientY - rect.top);
  drawCanvas();
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  addGesture(e.clientX - rect.left, e.clientY - rect.top, true);
  drawCanvas();
});

canvas.addEventListener("mouseup", () => (drawing = false));
canvas.addEventListener("mouseleave", () => (drawing = false));

canvas.addEventListener(
  "touchstart",
  (e) => {
    if (e.target === canvas) e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    addGesture(touch.clientX - rect.left, touch.clientY - rect.top);
    drawCanvas();
  },
  false
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    if (e.target === canvas) e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    addGesture(touch.clientX - rect.left, touch.clientY - rect.top, true);
    drawCanvas();
  },
  false
);

canvas.addEventListener("touchend", () => (drawing = false));

document.getElementById("clear-button").addEventListener("click", clearCanvas);

const preprocessCanvas = (canvas) => {
  return tf.browser
    .fromPixels(canvas)
    .resizeNearestNeighbor([28, 28])
    .mean(2)
    .expandDims(2)
    .expandDims()
    .toFloat()
    .div(255.0);
};

const updateConsole = (data) => {
  const max = Math.max(...data);
  const index = data.indexOf(max);
  const confidence = Math.round(max * 100);
  document.getElementById(
    "console-output"
  ).innerHTML = `Prediction: <span class="digit">${index}</span> (${confidence}%)`;
};

const displayProgressBars = (data) => {
  const container = document.getElementById("progress-bars");
  container.innerHTML = "";
  data.forEach((value, i) => {
    const percent = Math.round(value * 100);
    container.innerHTML += `
      <div class="progress-wrapper">
        <div class="label">Digit ${i}: ${percent}%</div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${percent}%;"></div>
        </div>
      </div>`;
  });
};

let currentLanguage = "en"; // default

const langSelector = document.getElementById("voice-lang");
if (langSelector) {
  langSelector.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
  });
  currentLanguage = langSelector.value;
}

const speakPrediction = async (digit, confidence, language = "en") => {
  // Voice is optional; can comment this out if not needed.
  if (!('speechSynthesis' in window)) return;

  let voices = speechSynthesis.getVoices();
  if (!voices.length) {
    await new Promise(resolve => {
      speechSynthesis.onvoiceschanged = resolve;
    });
    voices = speechSynthesis.getVoices();
  }

  const msg = new SpeechSynthesisUtterance();

  if (language === "ar") {
    msg.text = `الرقم المتوقع هو ${digit} بنسبة ${confidence} بالمئة.`;
    msg.lang = "ar-SA";
  } else if (language === "ku") {
    msg.text = `ژمارەی پێشبینکراو ${digit}ە بە ${confidence} لە سەد دڵنیایی.`;
    msg.lang = "tr-TR"; // fallback
  } else {
    msg.text = `The predicted digit is ${digit} with ${confidence} percent confidence.`;
    msg.lang = "en-US";
  }

  const voice =
    voices.find((v) =>
      v.lang.toLowerCase().startsWith(msg.lang.slice(0, 2).toLowerCase())
    ) || voices.find((v) => v.lang.toLowerCase().startsWith("en"));

  if (voice) msg.voice = voice;

  msg.rate = 1;
  msg.volume = 1;
  msg.pitch = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
};

document.getElementById("predict-button").addEventListener("click", async () => {
  const tensor = preprocessCanvas(canvas);
  const prediction = await model.predict(tensor).data();
  const results = Array.from(prediction);

  updateConsole(results);
  displayProgressBars(results);

  const index = results.indexOf(Math.max(...results));
  const confidence = Math.round(results[index] * 100);
  speakPrediction(index, confidence, currentLanguage);
});

const loadModel = async () => {
  model = await tf.loadLayersModel("models/model.json");
  console.log("Model loaded");
};

(async () => {
  await loadModel();
})();
