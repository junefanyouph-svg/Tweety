export const MAX_POST_IMAGES = 10

export const getPostImageUrls = (post) => {
  if (!post) return []

  const urls = []

  if (Array.isArray(post.image_urls)) {
    urls.push(...post.image_urls.filter(Boolean))
  }

  if (post.image_url) {
    urls.unshift(post.image_url)
  }

  return [...new Set(urls.filter(Boolean))]
}
