// src/components/MediaCapture.jsx
// 일기에 첨부할 사진/짧은(≤5초) 동영상을 카메라로 촬영하거나 파일에서 선택합니다.
// Firestore 1MB 제한에 맞춰 사진은 리사이즈, 동영상은 저비트레이트로 녹화합니다.
import { useEffect, useRef, useState } from "react";
import { Camera, Video, Upload, X, RotateCcw, Check } from "lucide-react";
import "./MediaCapture.css";

const MAX_VIDEO_MS = 5000;
const PHOTO_MAX = 900; // px
const MAX_BYTES = 900 * 1024; // dataURL 대략 상한 (Firestore 1MB 여유)

// 이미지 파일/캔버스를 최대 변 PHOTO_MAX의 JPEG dataURL로 리사이즈
function resizeImage(source) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(null);
    img.src = source;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => resolve(null);
    r.readAsDataURL(blob);
  });
}

function MediaCapture({ onCapture, onClose }) {
  const [mode, setMode] = useState("choose"); // choose | photo | video
  const [preview, setPreview] = useState(null); // { type, dataUrl }
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileRef = useRef(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopStream(), []);

  // 카메라 스트림 시작 (photo/video 진입 시)
  const startCamera = async (withAudio) => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 } },
        audio: withAudio,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      console.error(e);
      setError("카메라 권한이 필요해요. 파일 선택을 이용해 주세요.");
    }
  };

  const enterPhoto = async () => {
    setMode("photo");
    await startCamera(false);
  };
  const enterVideo = async () => {
    setMode("video");
    await startCamera(true);
  };

  // 사진 촬영
  const takePhoto = async () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = await resizeImage(canvas.toDataURL("image/jpeg", 0.9));
    stopStream();
    setPreview({ type: "image", dataUrl });
  };

  // 동영상 녹화 (최대 5초, 자동 종료)
  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 600000,
      audioBitsPerSecond: 64000,
    });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      stopStream();
      setRecording(false);
      setCountdown(0);
      if (blob.size > MAX_BYTES * 1.4) {
        setError("동영상이 너무 커요. 더 짧게 찍어 주세요.");
        setMode("choose");
        return;
      }
      const dataUrl = await blobToDataUrl(blob);
      setPreview({ type: "video", dataUrl });
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    // 5초 카운트다운 후 자동 종료
    let left = 5;
    setCountdown(left);
    const timer = setInterval(() => {
      left -= 1;
      setCountdown(left);
      if (left <= 0) clearInterval(timer);
    }, 1000);
    setTimeout(() => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      clearInterval(timer);
    }, MAX_VIDEO_MS);
  };

  // 파일에서 선택
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.type.startsWith("image/")) {
      const dataUrl = await resizeImage(await blobToDataUrl(file));
      setPreview({ type: "image", dataUrl });
    } else if (file.type.startsWith("video/")) {
      // 길이/용량 체크
      const url = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = async () => {
        URL.revokeObjectURL(url);
        if (vid.duration > 6) {
          setError("동영상은 5초 이내만 첨부할 수 있어요.");
          return;
        }
        if (file.size > MAX_BYTES * 1.4) {
          setError("동영상 용량이 커요. 더 짧고 작은 영상을 선택해 주세요.");
          return;
        }
        const dataUrl = await blobToDataUrl(file);
        setPreview({ type: "video", dataUrl });
      };
      vid.src = url;
    } else {
      setError("사진 또는 동영상만 첨부할 수 있어요.");
    }
  };

  const retake = () => {
    setPreview(null);
    setMode("choose");
  };

  const confirm = () => {
    if (preview?.dataUrl) onCapture(preview);
    onClose();
  };

  return (
    <div className="media-overlay" onClick={onClose}>
      <div className="media-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="media-close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        {/* 미리보기 (촬영/선택 완료) */}
        {preview ? (
          <div className="media-preview">
            {preview.type === "image" ? (
              <img src={preview.dataUrl} alt="첨부 미리보기" />
            ) : (
              <video src={preview.dataUrl} controls playsInline />
            )}
            <div className="media-actions">
              <button type="button" className="media-btn ghost" onClick={retake}>
                <RotateCcw size={16} /> 다시
              </button>
              <button type="button" className="media-btn solid" onClick={confirm}>
                <Check size={16} /> 사용하기
              </button>
            </div>
          </div>
        ) : mode === "choose" ? (
          <div className="media-choose">
            <h3 className="media-title">📎 사진 · 동영상 첨부</h3>
            <button type="button" className="media-option" onClick={enterPhoto}>
              <Camera size={20} /> 사진 촬영
            </button>
            <button type="button" className="media-option" onClick={enterVideo}>
              <Video size={20} /> 동영상 촬영 (5초)
            </button>
            <button
              type="button"
              className="media-option"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={20} /> 파일에서 선택
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              hidden
              onChange={handleFile}
            />
            {error && <p className="media-error">{error}</p>}
          </div>
        ) : (
          // 카메라 라이브 뷰
          <div className="media-camera">
            <video ref={videoRef} muted playsInline className="media-live" />
            {recording && (
              <div className="media-rec-badge">● {countdown}s</div>
            )}
            <div className="media-actions">
              {mode === "photo" ? (
                <button
                  type="button"
                  className="media-shutter"
                  onClick={takePhoto}
                  aria-label="촬영"
                />
              ) : (
                <button
                  type="button"
                  className={`media-shutter rec ${recording ? "on" : ""}`}
                  onClick={startRecording}
                  disabled={recording}
                  aria-label="녹화"
                />
              )}
            </div>
            {error && <p className="media-error">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaCapture;
