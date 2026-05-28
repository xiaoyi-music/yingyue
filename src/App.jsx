import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import HistoryPage from './pages/HistoryPage'
import PlaylistPage from './pages/PlaylistPage'
import NowPlayingPage from './pages/NowPlayingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 全屏播放页 —— 无 Layout 包裹 */}
        <Route path="now-playing" element={<NowPlayingPage />} />

        {/* 常规页面 —— 有底部播放栏 + 导航 */}
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="playlists" element={<PlaylistPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
