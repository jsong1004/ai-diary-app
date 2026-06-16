// src/utils/coverImage.js
// OpenRouter(Nano Banana / Gemini 2.5 Flash Image)로 일기 표지 이미지를 생성하고,
// Firestore 1MB 한도에 맞게 512px로 리사이즈하는 유틸입니다.

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env?.VITE_OPENROUTER_API_KEY;
const IMAGE_MODEL =
  import.meta.env?.VITE_OPENROUTER_IMAGE_MODEL ||
  "google/gemini-2.5-flash-image";

// 이미지 생성 요청 body를 만듭니다. (테스트 가능하도록 분리)
export function buildImageRequestBody(imagePrompt) {
  return {
    model: IMAGE_MODEL,
    modalities: ["image", "text"],
    messages: [{ role: "user", content: imagePrompt }],
  };
}

// OpenRouter 응답에서 base64 data URL을 추출합니다. (테스트 가능하도록 분리)
export function extractImageUrl(data) {
  return data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
}

// 표지 이미지를 생성합니다. 실패하면 null을 돌려줍니다(일기 저장은 막지 않음).
export async function generateCoverImage(imagePrompt) {
  if (!imagePrompt || !OPENROUTER_API_KEY) return null;

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildImageRequestBody(imagePrompt)),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const url = extractImageUrl(data);
    if (!url) return null;

    return await resizeDataUrl(url, 512);
  } catch {
    return null;
  }
}

// data URL 이미지를 정사각형 size로 리사이즈해서 JPEG data URL로 돌려줍니다.
// (Firestore 문서 1MB 한도 대응)
export function resizeDataUrl(dataUrl, size = 512) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // 중앙 크롭(cover)으로 정사각형에 맞춥니다.
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(dataUrl); // 리사이즈 실패 시 원본 반환
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
