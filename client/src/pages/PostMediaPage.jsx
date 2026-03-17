import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CachedImage from '../components/CachedImage'
import { getPostImageUrls } from '../utils/postMedia'
import { API_URL } from '../utils/apiUrl'

export default function PostMediaPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const imageRefs = useRef([])

  const imagesFromState = useMemo(() => location.state?.images || [], [location.state?.images])
  const initialIndex = location.state?.initialIndex || 0
  const from = location.state?.from || `/post/${id}`
  const fromLabel = location.state?.fromLabel || 'Back'

  useEffect(() => {
    if (!imagesFromState.length) return
    const target = imageRefs.current[initialIndex]
    if (target) {
      target.scrollIntoView({ block: 'center' })
    }
  }, [imagesFromState, initialIndex])

  const images = imagesFromState

  useEffect(() => {
    if (imagesFromState.length) return

    let active = true
    const loadPost = async () => {
      const res = await fetch(`${API_URL}/posts/single/${id}`)
      const data = await res.json()
      if (!active || data?.error) return
      const urls = getPostImageUrls(data)
      if (!urls.length) {
        navigate(`/post/${id}`, { replace: true })
        return
      }
      navigate(`/post/${id}/media`, {
        replace: true,
        state: {
          images: urls,
          initialIndex: 0,
          from,
          fromLabel
        }
      })
    }

    loadPost()
    return () => {
      active = false
    }
  }, [from, fromLabel, id, imagesFromState.length, navigate])

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4 pb-10">
      <div className="sticky top-0 z-20 bg-bg-dark/85 backdrop-blur-md border-b border-border-dark flex items-center gap-3 py-3 mb-4">
        <button
          className="p-2 hover:bg-white/5 rounded-full text-text-main transition-colors flex items-center gap-2 text-[0.95rem] font-bold"
          onClick={() => navigate(from)}
        >
          <span className="material-symbols-outlined filled">arrow_back</span> {fromLabel}
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {images.map((imageUrl, index) => (
          <div
            key={`${imageUrl}-${index}`}
            ref={node => { imageRefs.current[index] = node }}
            className="rounded-[28px] overflow-hidden border border-border-dark bg-surface shadow-[0_14px_40px_rgba(0,0,0,0.28)]"
          >
            <CachedImage src={imageUrl} fallbackSrc={imageUrl} className="w-full max-h-[85vh] object-contain bg-black/15 block" alt="" />
          </div>
        ))}
      </div>
    </div>
  )
}
