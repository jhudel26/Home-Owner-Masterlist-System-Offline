export default function imageLoader({ src, width, quality }) {
  // For /uploads/ paths, return them as-is since they're handled by the API rewrite
  if (src.startsWith('/uploads/')) {
    return src;
  }
  // For other images, use default Next.js behavior
  return `${src}?w=${width}&q=${quality || 75}`;
}