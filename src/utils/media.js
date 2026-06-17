// src/utils/media.js
// 첨부 미디어(사진/동영상)를 감정 분석에 쓰기 위한 헬퍼.

// 동영상 data URL에서 한 프레임을 추출해 JPEG data URL로 돌려줍니다.
// (대부분의 멀티모달 모델은 동영상을 직접 못 받으므로 대표 프레임을 이미지로 분석)
export function extractVideoFrame(videoDataUrl, atSec = 0.5) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.onloadeddata = () => {
        // 너무 길면 중간 지점, 짧으면 가능한 지점으로
        const t = Math.min(atSec, (video.duration || 1) / 2);
        const grab = () => {
          try {
            const max = 512;
            const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
            const w = Math.round(video.videoWidth * scale) || max;
            const h = Math.round(video.videoHeight * scale) || max;
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(video, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          } catch {
            resolve(null);
          }
        };
        video.onseeked = grab;
        try {
          video.currentTime = t;
        } catch {
          grab();
        }
      };
      video.onerror = () => resolve(null);
      video.src = videoDataUrl;
    } catch {
      resolve(null);
    }
  });
}
