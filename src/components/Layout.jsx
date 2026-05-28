import { Outlet } from 'react-router-dom'
import NavMenu from './NavMenu'
import PlayerBar from './PlayerBar'

export default function Layout() {
  return (
    <div className="flex h-[100dvh] flex-col bg-gray-900 text-white">
      {/* 页面内容 */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* 底部播放栏 */}
      <PlayerBar />

      {/* 底部导航 */}
      <NavMenu />
    </div>
  )
}
