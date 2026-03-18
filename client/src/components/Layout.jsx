import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import NotificationToast from './NotificationToast'
import { useLocation } from 'react-router-dom'
import ComposeModal from './ComposeModal'
import { useScrollDirection } from '../utils/useScrollDirection'

export default function Layout({ children }) {
  const location = useLocation()
  const isChatPage = /^\/messages\/[^/]+/.test(location.pathname)
  const isSettingsPage = location.pathname === '/settings'
  const isSwitchAccountPage = location.pathname === '/switch-account'
  
  // Pages where we don't want the FAB (optional, but good for UX)
  const hideFabPages = ['/settings', '/switch-account', '/messages']
  const shouldHideFabByRoute = hideFabPages.some(p => location.pathname.startsWith(p))

  const [showCompose, setShowCompose] = useState(false)
  const scrollDirection = useScrollDirection()
  const isHidden = scrollDirection === 'down'

  useEffect(() => {
    const handleOpen = () => setShowCompose(true)
    window.addEventListener('openCompose', handleOpen)
    return () => window.removeEventListener('openCompose', handleOpen)
  }, [])

  const handleComposeSuccess = () => {
    window.dispatchEvent(new CustomEvent('postCreated'))
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className={`main-content flex-1 min-h-dvh ml-[260px] max-md:ml-0 max-md:pt-0 max-md:w-full ${isChatPage ? 'max-md:pb-0' : 'max-md:pb-[calc(70px+env(safe-area-inset-bottom))]'}`}>
        {children}
      </div>
      
      {!isChatPage && <BottomNav />}
      
      {/* Floating Action Button (FAB) - Mobile Specific Scroll Behavior */}
      {!isChatPage && !shouldHideFabByRoute && (
        <button
          className={`fixed z-[150] w-[56px] h-[56px] rounded-full bg-primary text-white border-none shadow-[0_6px_24px_rgba(0,191,166,0.4)] cursor-pointer flex items-center justify-center text-[1.4rem] hover:scale-105 active:scale-95 transition-all duration-300 bottom-[100px] right-5 md:bottom-10 md:right-10 ${isHidden ? 'max-md:scale-0 max-md:opacity-0' : 'scale-100 opacity-100'}`}
          onClick={() => window.dispatchEvent(new CustomEvent('openCompose'))}
          aria-label="Create post"
        >
          <span className="material-symbols-outlined filled">add</span>
        </button>
      )}

      <NotificationToast />
      <ComposeModal 
        isOpen={showCompose} 
        onClose={() => setShowCompose(false)} 
        onSuccess={handleComposeSuccess} 
      />
    </div>
  )
}
