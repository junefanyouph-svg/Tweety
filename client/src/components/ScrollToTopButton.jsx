import { useEffect, useState } from 'react'

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 280)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed right-4 md:right-6 z-[50] w-11 h-11 rounded-full border border-border-dark bg-surface text-primary shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${visible ? 'opacity-100 pointer-events-auto bottom-20 md:bottom-6' : 'opacity-0 pointer-events-none bottom-16 md:bottom-4'}`}
    >
      <i className="fa-solid fa-arrow-up"></i>
    </button>
  )
}
