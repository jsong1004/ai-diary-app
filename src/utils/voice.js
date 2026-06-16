// src/utils/voice.js
// 브라우저 녹음 오디오를 16kHz mono WAV로 변환해 OpenRouter(omni 모델)로 전사합니다.

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env?.VITE_OPENROUTER_API_KEY;
const AUDIO_MODEL =
  import.meta.env?.VITE_OPENROUTER_AUDIO_MODEL ||
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

// 브라우저가 음성 녹음을 지원하는지
export function isVoiceSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}

// AudioBuffer(mono) → 16-bit PCM WAV ArrayBuffer
function encodeWav(audioBuffer) {
  const samples = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// 녹음 Blob(webm/ogg 등) → 16kHz mono WAV base64
export async function blobToWavBase64(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const decodeCtx = new AudioCtx();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  decodeCtx.close?.();

  // OfflineAudioContext로 16kHz mono 리샘플링
  const length = Math.ceil(decoded.duration * 16000);
  const offline = new OfflineAudioContext(1, Math.max(1, length), 16000);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();

  return arrayBufferToBase64(encodeWav(rendered));
}

// WAV base64 → OpenRouter omni 모델로 전사. 실패 시 throw.
export async function transcribeAudio(wavBase64) {
  if (!OPENROUTER_API_KEY) throw new Error("API 키가 없어요.");

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AUDIO_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "다음 오디오를 한국어로 정확히 받아쓰기 해줘. 설명이나 따옴표 없이 전사된 문장만 출력해.",
            },
            { type: "input_audio", input_audio: { data: wavBase64, format: "wav" } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`전사 실패 (${res.status})`);
  const data = await res.json();
  let text = data?.choices?.[0]?.message?.content?.trim() || "";
  // 모델이 따옴표로 감쌀 때 제거
  text = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return text;
}
