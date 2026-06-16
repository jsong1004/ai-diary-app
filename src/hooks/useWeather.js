// src/hooks/useWeather.js
// 도시 이름으로 현재 날씨를 가져오는 훅입니다. (하루 1회 호출 + localStorage 캐시는 weather.js가 담당)
import { useEffect, useState } from "react";
import { getWeatherForCity } from "../utils/weather";

const EMPTY = { weather: null, loading: false, error: "" };

export function useWeather(city) {
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (!city) return; // 도시 없으면 아래에서 EMPTY를 그대로 반환

    let active = true;
    // 로딩 표시 후 비동기 조회 (콜백에서 결과 반영)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ weather: null, loading: true, error: "" });

    getWeatherForCity(city)
      .then((weather) => {
        if (active) setState({ weather, loading: false, error: "" });
      })
      .catch((err) => {
        if (active)
          setState({ weather: null, loading: false, error: err.message });
      });

    return () => {
      active = false;
    };
  }, [city]);

  // 도시가 없으면 항상 빈 상태를 반환 (effect에서 동기 setState 하지 않음)
  if (!city) return EMPTY;
  return state;
}
