import { useState, useEffect, useRef } from 'react'

const GIPHY_KEY = 'l1VWAKXlnyiPfOc6kY8rYhdL1TRAhciM'

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchTrending()
    inputRef.current?.focus()
  }, [])

  const fetchTrending = async () => {
    setLoading(true)
    const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&rating=g`)
    const data = await res.json()
    setGifs(data.data)
    setLoading(false)
  }

  const fetchSearch = async (q) => {
    if (!q.trim()) { fetchTrending(); return }
    setLoading(true)
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${q}&limit=24&rating=g`)
    const data = await res.json()
    setGifs(data.data)
    setLoading(false)
  }

  const handleSearch = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(window._gifTimeout)
    window._gifTimeout = setTimeout(() => fetchSearch(val), 500)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl border border-border-dark w-[480px] max-w-full maxHeight-[70vh] flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
        <div className="flex gap-2 p-3 border-b border-border-dark">
          <input
            ref={inputRef}
            className="flex-1 bg-bg-dark border border-border-dark rounded-xl py-2.5 px-3.5 text-text-main text-[0.95rem] outline-none focus:border-primary transition-colors"
            placeholder="Search GIFs..."
            value={query}
            onChange={handleSearch}
          />
          <button className="bg-none border-none cursor-pointer text-text-dim text-xl p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10 text-text-dim">Loading...</div>
        ) : (
          <div className="grid grid-cols-4 gap-1 p-2 overflow-y-auto max-h-[400px]">
            {gifs.map(gif => (
              <img
                key={gif.id}
                src={gif.images.fixed_height_small.url}
                className="w-full h-20 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-primary transition-all"
                onClick={() => onSelect(gif.images.original.url)}
                alt={gif.title}
              />
            ))}
          </div>
        )}

        <div className="p-2.5 text-center text-text-dim/60 text-[0.75rem] border-t border-border-dark bg-white/5">
          Powered by GIPHY
        </div>
      </div>
    </div>
  )
}