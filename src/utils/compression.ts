import LZString from 'lz-string';

/**
 * Compress content to Base64 (for Octarine URI scheme)
 * This is the format Octarine expects for compressedContent parameter
 */
export function compressToBase64(data: string): string {
  return LZString.compressToBase64(data);
}

/**
 * Decompress from Base64
 */
export function decompressFromBase64(compressed: string): string | null {
  return LZString.decompressFromBase64(compressed);
}

/**
 * Compress data for URL-safe transmission (alternative encoding)
 * Uses lz-string's URI-safe encoding
 */
export function compressToEncodedURI(data: string): string {
  return LZString.compressToEncodedURIComponent(data);
}

/**
 * Decompress URL-safe data
 */
export function decompressFromEncodedURI(compressed: string): string | null {
  return LZString.decompressFromEncodedURIComponent(compressed);
}

/**
 * Compress data to UTF-16 string (for storage)
 */
export function compressToStorage(data: string): string {
  return LZString.compressToUTF16(data);
}

/**
 * Decompress from UTF-16 string (from storage)
 */
export function decompressFromStorage(compressed: string): string | null {
  return LZString.decompressFromUTF16(compressed);
}
