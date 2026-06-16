// src/utils/weather.js
// Open-Meteo(키 불필요) 기반 날씨 조회 + WMO 날씨 코드 → 배경/아이콘 매핑 유틸입니다.

// WMO weather code → 5가지 카테고리(맑음/흐림/비/눈/뇌우)로 분류하고
// 각 카테고리의 아이콘·라벨·배경 그라데이션을 돌려줍니다. (순수 함수)
export function weatherFromCode(code) {
  const c = Number(code);

  // 뇌우
  if ([95, 96, 99].includes(c)) {
    return preset("thunder", "⛈️", "뇌우", "#667eea", "#764ba2");
  }
  // 눈
  if ([71, 73, 75, 77, 85, 86].includes(c)) {
    return preset("snow", "❄️", "눈", "#f3e8ff", "#e0e7ff");
  }
  // 비 (이슬비/비/소나기)
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)
  ) {
    return preset("rain", "🌧️", "비", "#a1c4fd", "#c2e9fb");
  }
  // 맑음 (clear / mainly clear)
  if ([0, 1].includes(c)) {
    return preset("sunny", "☀️", "맑음", "#f6d365", "#fda085");
  }
  // 그 외(부분 흐림/흐림/안개)는 흐림으로
  return preset("cloudy", "☁️", "흐림", "#e0e7ff", "#c7d2fe");
}

function preset(key, icon, label, from, to) {
  return {
    key,
    icon,
    label,
    gradient: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  };
}

const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const CACHE_PREFIX = "weatherCache:";

// 오늘 날짜 키 (YYYY-MM-DD, 로컬 기준)
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// 도시 이름 → 위도/경도 (Open-Meteo 지오코딩, 한국어 우선)
async function geocodeCity(city) {
  const url = `${GEO_API}?name=${encodeURIComponent(
    city
  )}&count=1&language=ko&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`지오코딩 실패 (${res.status})`);
  const data = await res.json();
  const place = data?.results?.[0];
  if (!place) throw new Error("도시를 찾을 수 없어요.");
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    name: place.name,
  };
}

// 도시 이름으로 현재 날씨를 가져옵니다.
// 하루에 한 번만 네트워크 호출하고 나머지는 localStorage 캐시를 사용합니다.
// 반환: { city, temperature, code, weather, fetchedAt }
export async function getWeatherForCity(city) {
  if (!city) throw new Error("도시가 설정되지 않았어요.");

  const cacheKey = `${CACHE_PREFIX}${city}`;
  const today = todayKey();

  // 1) 같은 날짜의 캐시가 있으면 그대로 사용
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached && cached.date === today && cached.data) {
      return { ...cached.data, weather: weatherFromCode(cached.data.code) };
    }
  } catch {
    // 캐시 파싱 실패는 무시하고 새로 가져옵니다.
  }

  // 2) 지오코딩 → 현재 날씨 조회
  const { latitude, longitude, name } = await geocodeCity(city);
  const url = `${FORECAST_API}?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`날씨 조회 실패 (${res.status})`);
  const data = await res.json();
  const current = data?.current_weather;
  if (!current) throw new Error("날씨 데이터가 비어 있어요.");

  const result = {
    city: name || city,
    temperature: Math.round(current.temperature),
    code: current.weathercode,
    fetchedAt: Date.now(),
  };

  // 3) 캐시에 저장 (날짜 포함)
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ date: today, data: result })
    );
  } catch {
    // 저장 실패(용량 등)는 치명적이지 않으므로 무시
  }

  return { ...result, weather: weatherFromCode(result.code) };
}
