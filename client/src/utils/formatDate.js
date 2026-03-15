/**
 * Formats a date string into a relative or absolute date:
 * - Under 1 hour: "Xm"
 * - Under 24 hours: "Xh"
 * - Under 7 days: "Xd"
 * - Under 4 weeks: "Xw"
 * - Same year: "Mon DD" (e.g. "Mar 15")
 * - Different year: "Mon DD YYYY" (e.g. "Jun 16 2025")
 */
export function formatDate(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const day = date.getDate()

  if (date.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`
  }

  return `${month} ${day} ${date.getFullYear()}`
}
