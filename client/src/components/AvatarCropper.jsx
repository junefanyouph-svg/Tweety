import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

export default function AvatarCropper({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
    onConfirm(croppedBlob)
  }

  return (
    <div className="fixed inset-0 bg-black/85 z-[99999] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-border-dark w-[420px] max-w-full p-6 flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-[popIn_0.3s_ease-out]">
        <p className="text-text-main font-bold text-center m-0">Adjust your photo</p>

        {/* Cropper */}
        <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black/50 border border-border-dark">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-3 px-1">
          <i className="fa-solid fa-magnifying-glass-minus text-text-dim text-[0.8rem]"></i>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
          />
          <i className="fa-solid fa-magnifying-glass-plus text-text-dim text-[0.8rem]"></i>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 justify-end mt-2">
          <button className="py-2.5 px-5 bg-transparent text-text-dim border border-border-dark rounded-xl cursor-pointer text-[0.95rem] hover:bg-white/5 transition-colors" onClick={onCancel}>
            Cancel
          </button>
          <button className="py-2.5 px-5 bg-primary text-white border-none rounded-xl cursor-pointer text-[0.95rem] font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg" onClick={handleConfirm}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper to crop the image
const getCroppedImg = (imageSrc, croppedAreaPixels) => {
  return new Promise((resolve) => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = croppedAreaPixels.width
      canvas.height = croppedAreaPixels.height
      const ctx = canvas.getContext('2d')

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      )

      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    }
  })
}