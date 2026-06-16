import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, NavLink, useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login'
import LockScreen from './components/LockScreen'
import DiaryEditor from './components/DiaryEditor'
import DiaryList from './components/DiaryList'
import ChatBot from './components/ChatBot'
import Stats from './components/Stats'
import Calendar from './components/Calendar'
import ThemeToggle from './components/ThemeToggle'
import WeatherWidget from './components/WeatherWidget'
import SettingsModal from './components/SettingsModal'
import InstallPWA from './components/InstallPWA'
import Toast from './components/Toast'
import { useTheme } from './hooks/useTheme'
import { useUserSettings } from './hooks/useUserSettings'
import { useWeather } from './hooks/useWeather'
import { useDailyReminder } from './hooks/useDailyReminder'
import { useAppLock } from './hooks/useAppLock'
import './App.css'

// 로그인 후 모든 페이지가 공유하는 레이아웃 (날씨 배경 + 헤더 + 본문)
function Layout({ user, appLock, children }) {
  const { theme } = useTheme()
  const { city, setCity, loading: cityLoading } = useUserSettings(user)
  const { weather, loading: weatherLoading } = useWeather(city)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState('')
  useDailyReminder(user)

  // 날씨 그라데이션 배경 (다크 모드에서는 CSS가 처리하므로 라이트 모드에서만 적용)
  const bgStyle =
    theme === 'light' && weather
      ? { background: weather.weather.gradient }
      : undefined

  return (
    <div className="app-main" style={bgStyle}>
      <header className="app-header">
        <Link to="/" className="app-brand">📔 AI 다이어리</Link>

        <nav className="app-nav">
          <NavLink to="/diaries" className="app-nav-link">📔 일기장</NavLink>
          <NavLink to="/chat" className="app-nav-link">💗 챗봇</NavLink>
          <NavLink to="/calendar" className="app-nav-link">📅 캘린더</NavLink>
          <NavLink to="/stats" className="app-nav-link">📊 통계</NavLink>
        </nav>

        <div className="app-header-right">
          <WeatherWidget
            city={city}
            weather={weather}
            loading={weatherLoading}
            onSettings={() => setSettingsOpen(true)}
          />
          <ThemeToggle />
          {appLock.hasPin && (
            <button
              type="button"
              className="lock-now-button"
              onClick={appLock.lockNow}
              aria-label="지금 잠그기"
              title="지금 잠그기"
            >
              🔒
            </button>
          )}
          <span className="app-greeting">
            {user.displayName ? `${user.displayName}님 👋` : '환영해요 👋'}
          </span>
          <button type="button" className="logout-button" onClick={() => signOut(auth)}>
            로그아웃
          </button>
        </div>
      </header>
      <main>{children}</main>

      {settingsOpen && (
        <SettingsModal
          user={user}
          city={city}
          onSaveCity={setCity}
          onToast={setToast}
          onClose={() => setSettingsOpen(false)}
          appLock={appLock}
        />
      )}

      <Toast message={toast} onDone={() => setToast('')} />

      {/* 도시 미설정 시 안내 (로딩 끝나고 도시 없을 때) */}
      {!cityLoading && !city && !settingsOpen && (
        <button
          type="button"
          className="city-prompt"
          onClick={() => setSettingsOpen(true)}
        >
          📍 도시를 설정하고 날씨 배경을 켜보세요
        </button>
      )}

      <InstallPWA />
    </div>
  )
}

// 새 일기 작성 페이지: 저장이 끝나면 목록(/diaries)으로 이동합니다.
function WritePage({ user }) {
  const navigate = useNavigate()
  return (
    <div className="write-page">
      <DiaryEditor user={user} onSaved={() => navigate('/diaries')} />
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)   // 로그인한 사용자 정보
  const [loading, setLoading] = useState(true)  // 인증 상태 확인 중 여부
  const appLock = useAppLock()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="app-loading">
        <p>불러오는 중...</p>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  if (appLock.locked) {
    return <LockScreen onUnlock={appLock.unlock} />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout user={user} appLock={appLock}><DiaryList user={user} /></Layout>} />
      <Route path="/diaries" element={<Layout user={user} appLock={appLock}><DiaryList user={user} /></Layout>} />
      <Route path="/write" element={<Layout user={user} appLock={appLock}><WritePage user={user} /></Layout>} />
      <Route path="/chat" element={<Layout user={user} appLock={appLock}><ChatBot user={user} /></Layout>} />
      <Route path="/calendar" element={<Layout user={user} appLock={appLock}><Calendar user={user} /></Layout>} />
      <Route path="/stats" element={<Layout user={user} appLock={appLock}><Stats user={user} /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
