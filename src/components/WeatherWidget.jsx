// src/components/WeatherWidget.jsx
// 상단 헤더에 표시되는 반투명(glassmorphism) 날씨 위젯입니다.
// 날씨 아이콘 + 기온 + 도시명을 보여주고, 도시가 없으면 설정 버튼을 보여줍니다.
import { MapPin } from "lucide-react";
import "./WeatherWidget.css";

function WeatherWidget({ city, weather, loading, onSettings }) {
  // 도시 미설정: 설정 유도 버튼
  if (!city) {
    return (
      <button type="button" className="weather-widget weather-set" onClick={onSettings}>
        <MapPin size={15} />
        <span>도시 설정</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="weather-widget"
      onClick={onSettings}
      title="날씨 설정 변경"
    >
      {loading || !weather ? (
        <span className="weather-loading">날씨 불러오는 중…</span>
      ) : (
        <>
          <span className="weather-icon" aria-hidden="true">
            {weather.weather.icon}
          </span>
          <span className="weather-temp">{weather.temperature}°</span>
          <span className="weather-city">{weather.city}</span>
        </>
      )}
    </button>
  );
}

export default WeatherWidget;
