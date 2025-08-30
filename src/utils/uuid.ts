export function uuidToHex(uuid: string): string {
  return uuid.replace(/-/g, '')
}

export function hexToUuid(hex: string): string {
  if (hex.length !== 32) {
    throw new Error('Invalid hex string length')
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}