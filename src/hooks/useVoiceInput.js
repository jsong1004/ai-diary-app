// src/hooks/useVoiceInput.js
// 마이크 녹음 → OpenRouter 전사 → onResult(text) 콜백으로 전달하는 훅입니다.
import { useCallback, useRef, useState } from "react";
import {
  isVoiceSupported,
  blobToWavBase64,
  transcribeAudio,
} from "../utils/voice";

export function useVoiceInput(onResult) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        if (blob.size === 0) return;
        setBusy(true);
        try {
          const wav = await blobToWavBase64(blob);
          const text = await transcribeAudio(wav);
          if (text) onResult(text);
          else setError("음성을 알아듣지 못했어요. 다시 시도해 주세요.");
        } catch (e) {
          console.error(e);
          setError("음성 인식에 실패했어요. 잠시 후 다시 시도해 주세요.");
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      console.error(e);
      setError("마이크 권한이 필요해요. 브라우저 설정을 확인해 주세요.");
    }
  }, [onResult]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const toggle = useCallback(() => {
    if (recording) stop();
    else start();
  }, [recording, start, stop]);

  return { supported: isVoiceSupported(), recording, busy, error, toggle };
}
