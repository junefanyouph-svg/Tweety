import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'

/* ── canvas helper ─────────────────────────────────────────── */
function getCroppedImg(imageSrc, pixelCrop) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(
        img,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
      )
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        0.92
      )
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

/* ── component ─────────────────────────────────────────────── */
export default function AvatarCropper({ imageSrc, onConfirm, onCancel, isSubmitting = false }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedPixels, setCroppedPixels] = useState(null)

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedPixels(pixels)
  }, [])

  const handleApply = async () => {
    if (!croppedPixels) return
    const blob = await getCroppedImg(imageSrc, croppedPixels)
    onConfirm(blob)
  }

  /* ── all styles inline to avoid any Tailwind / CSS conflicts ── */
  const overlay = {
    position: 'fixed',
    inset: 0,
    zIndex: 999999,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  }

  const card = {
    background: 'var(--color-surface, #1a1d27)',
    borderRadius: 16,
    border: '1px solid var(--color-border-dark, #2a2d3a)',
    width: 400,
    maxWidth: '95vw',
    maxHeight: '90vh',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  }

  const title = {
    margin: 0,
    color: 'var(--color-text-main, #e8e8e8)',
    fontWeight: 700,
    textAlign: 'center',
    fontSize: '1rem',
    flexShrink: 0,
  }

  const cropperBox = {
    position: 'relative',
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    background: '#000',
    border: '1px solid var(--color-border-dark, #2a2d3a)',
    flexShrink: 0,
  }

  const sliderRow = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 4px',
    flexShrink: 0,
  }

  const zoomBtn = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid var(--color-border-dark, #2a2d3a)',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--color-text-main, #e8e8e8)',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    flexShrink: 0,
  }

  const slider = {
    flex: 1,
    accentColor: 'var(--color-primary, #00BFA6)',
    cursor: 'pointer',
    height: 6,
  }

  const btnRow = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    flexShrink: 0,
  }

  const cancelBtn = {
    padding: '10px 20px',
    background: 'transparent',
    color: 'var(--color-text-dim, #555)',
    border: '1px solid var(--color-border-dark, #2a2d3a)',
    borderRadius: 12,
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    fontSize: '0.95rem',
    fontWeight: 700,
    opacity: isSubmitting ? 0.5 : 1,
    flexShrink: 0,
    pointerEvents: isSubmitting ? 'none' : 'auto',
  }

  const applyBtn = {
    padding: '10px 20px',
    background: 'var(--color-primary, #00BFA6)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    fontSize: '0.95rem',
    fontWeight: 700,
    opacity: isSubmitting ? 0.5 : 1,
    flexShrink: 0,
    pointerEvents: isSubmitting ? 'none' : 'auto',
    boxShadow: '0 4px 14px rgba(0,191,166,0.3)',
  }

  const modal = (
    <div style={overlay} onClick={onCancel}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <p style={title}>Adjust your photo</p>

        {/* Crop area */}
        <div style={cropperBox}>
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

        {/* Zoom controls */}
        <div style={sliderRow}>
          <button
            type="button"
            style={zoomBtn}
            onClick={() => setZoom(z => Math.max(1, +(z - 0.2).toFixed(2)))}
          >
            −
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={slider}
          />
          <button
            type="button"
            style={zoomBtn}
            onClick={() => setZoom(z => Math.min(3, +(z + 0.2).toFixed(2)))}
          >
            +
          </button>
        </div>

        {/* Action buttons */}
        <div style={btnRow}>
          <button type="button" style={cancelBtn} onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" style={applyBtn} onClick={handleApply} disabled={isSubmitting}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )

  // Portal so no parent CSS can interfere
  return createPortal(modal, document.body)
}