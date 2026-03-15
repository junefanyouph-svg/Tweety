import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import NotificationToast from './NotificationToast'
import { useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const location = useLocation()
  const isChatPage = /^\/messages\/[^/]+/.test(location.pathname)

  return (
    <div className="flex">
      <Sidebar />
      <div className={`main-content flex-1 min-h-dvh ml-[260px] max-md:ml-0 max-md:pt-0 max-md:w-full ${isChatPage ? 'max-md:pb-0' : 'max-md:pb-[calc(70px+env(safe-area-inset-bottom))]'}`}>
        {children}
      </div>
      {!isChatPage && <BottomNav />}
      <NotificationToast />
    </div>
  )
}
