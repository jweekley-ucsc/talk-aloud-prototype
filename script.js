let mediaRecorder;
let audioChunks = [];
let startTime;
let timerInterval;
let recordingStarted = false;
let recordingStopped = false;

const recordButton = document.getElementById("recordBtn");
const timerDisplay = document.getElementById("timerDisplay");
const preview = document.getElementById("preview");
const downloadAudioBtn = document.getElementById("downloadAudio");
const downloadJsonBtn = document.getElementById("downloadJson");
const submitBtn = document.getElementById("submitBtn");
const reflectionInput = document.getElementById("reflectionInput");

recordButton.addEventListener("click", async () => {
  if (recordingStopped) return;

  if (!recordingStarted) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      startTime = new Date();
      recordingStarted = true;

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => handleRecordingStop();

      mediaRecorder.start();
      startTimer();

      recordButton.textContent = "Stop Recording";
      recordButton.classList.remove("bg-blue-600");
      recordButton.classList.add("bg-red-600");
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access denied.");
    }
  } else {
    mediaRecorder.stop();
    stopTimer();
    recordingStopped = true;
    recordButton.textContent = "Recording Complete";
    recordButton.disabled = true;
    recordButton.classList.remove("bg-red-600");
    recordButton.classList.add("bg-gray-400", "cursor-not-allowed");
  }
});

function startTimer() {
  let elapsed = 0;
  timerInterval = setInterval(() => {
    elapsed++;
    const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const secs = (elapsed % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

async function handleRecordingStop() {
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const audioFilename = `recording-${timestamp}.webm`;

  const audioUrl = URL.createObjectURL(audioBlob);
  downloadAudioBtn.onclick = () => {
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = audioFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  await sendToOpenAI(audioBlob, timestamp);
}

async function sendToOpenAI(audioBlob, timestamp) {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer INSERT API KEY HERE"  // Replace with your actual key
      },
      body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    const readable = result.text || "No transcript returned.";

    preview.textContent = readable;

    const transcriptData = {
      session_id: `sess_${Math.random().toString(36).slice(2, 10)}`,
      start_time: new Date(startTime).toISOString(),
      duration_sec: Math.round((new Date() - startTime) / 1000),
      reflection: reflectionInput.value.trim(),
      transcript: [{ timestamp: "00:00", speaker: "interviewee", text: readable }]
    };

    const jsonBlob = new Blob([JSON.stringify(transcriptData, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);

    downloadJsonBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = jsonUrl;
      a.download = `transcript-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    submitBtn.onclick = () => submitSession(transcriptData);
  } catch (err) {
    console.error("Transcription failed:", err);
    preview.textContent = "Transcription failed.";
  }
}

async function submitSession(data) {
  try {
    const response = await fetch("http://127.0.0.1:5050/submit-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    alert("Session successfully submitted.");
  } catch (err) {
    console.error("Error submitting session:", err);
    alert("Failed to submit session.");
  }
}
