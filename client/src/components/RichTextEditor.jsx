import { useRef, useEffect, useCallback } from 'react'

export default function RichTextEditor({ content, onChange, placeholder, textareaRef, minHeight = '100px', style = {}, onKeyDown, onPaste, autoFocus }) {
  const editorRef = useRef(null)
  const isComposingRef = useRef(false)
  const isInternalUpdate = useRef(false)

  useEffect(() => {
    if (autoFocus && editorRef.current) {
      setTimeout(() => {
        editorRef.current.focus()
      }, 50)
    }
  }, [autoFocus])

  // Convert plain text to HTML with styled spans
  const textToHtml = (text) => {
    if (!text) return ''

    // Escape HTML entities first, then apply styling
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const parts = escaped.split(/(@[a-zA-Z0-9_]+|https?:\/\/[^\s]+)/g)

    return parts.map((part) => {
      if (part.startsWith('@')) {
        return `<span style="color: var(--color-primary); font-weight: bold;">${part}</span>`
      }
      if (part.match(/^https?:\/\//)) {
        return `<span style="color: #1d9bf0; text-decoration: underline;">${part}</span>`
      }
      return part
    }).join('')
  }

  // Get plain text from contentEditable
  const getPlainText = () => {
    if (!editorRef.current) return ''
    // Use innerText to preserve line breaks from block elements, but normalize
    // browser-inserted empty-editor newlines to true empty text.
    const text = (editorRef.current.innerText || '').replace(/\r/g, '')
    if (text === '\n' || text === '\n\n') return ''
    return text
  }

  // Get cursor offset as character position in plain text
  const getCursorOffset = () => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !editorRef.current) return 0

    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(editorRef.current)
    preCaretRange.setEnd(range.endContainer, range.endOffset)
    return preCaretRange.toString().length
  }

  // Set cursor at a specific character offset in the plain text
  const setCursorOffset = (targetOffset) => {
    if (!editorRef.current) return

    const selection = window.getSelection()
    const range = document.createRange()

    // Walk the DOM tree in document order
    let charCount = 0
    let found = false

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    let node = walker.nextNode()
    while (node) {
      const nodeLen = node.length
      if (charCount + nodeLen >= targetOffset) {
        range.setStart(node, targetOffset - charCount)
        range.collapse(true)
        found = true
        break
      }
      charCount += nodeLen
      node = walker.nextNode()
    }

    if (!found) {
      // Place cursor at end
      range.selectNodeContents(editorRef.current)
      range.collapse(false)
    }

    selection.removeAllRanges()
    selection.addRange(range)
  }

  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposingRef.current) return

    const cursorPos = getCursorOffset()
    const text = getPlainText()

    // Mark that we're updating internally to avoid the useEffect re-sync
    isInternalUpdate.current = true

    // Synthesize an event-like object with selectionStart for mention detection
    const syntheticEvent = {
      target: {
        value: text,
        selectionStart: cursorPos
      }
    }
    onChange(syntheticEvent)

    // Re-render HTML with styling
    editorRef.current.innerHTML = textToHtml(text) || ''

    // Restore cursor
    setCursorOffset(cursorPos)

    // Reset the flag after a tick
    requestAnimationFrame(() => {
      isInternalUpdate.current = false
    })
  }, [onChange])

  const handleKeyDown = (e) => {
    if (onKeyDown) {
      onKeyDown(e)
      if (e.defaultPrevented) return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      document.execCommand('insertLineBreak')
    }
  }

  const handlePaste = async (e) => {
    if (onPaste) {
      const handled = await onPaste(e)
      if (handled) return
    }

    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  // Sync content from parent when it changes externally (e.g. mention insertion or clear after send)
  useEffect(() => {
    if (isInternalUpdate.current) return
    if (!editorRef.current) return

    const currentText = getPlainText().trim()
    const newContent = (content || '').trim()

    if (currentText !== newContent) {
      if (!newContent) {
        // Explicitly clear the editor
        editorRef.current.innerHTML = ''
      } else {
        editorRef.current.innerHTML = textToHtml(content)
        setCursorOffset(content.length)
      }
    }
  }, [content])

  // Assign ref so parent can access the DOM element
  useEffect(() => {
    if (textareaRef) {
      textareaRef.current = editorRef.current
    }
  }, [textareaRef])

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onCompositionStart={() => { isComposingRef.current = true }}
      onCompositionEnd={() => { isComposingRef.current = false; handleInput() }}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className="w-full relative border-none outline-none text-[1rem] leading-relaxed [font-family:inherit] bg-transparent text-text-main whitespace-pre-wrap [word-wrap:break-word] text-left cursor-text py-2.5"
      style={{
        minHeight: minHeight,
        ...style
      }}
      data-placeholder={placeholder}
    />
  )
}
