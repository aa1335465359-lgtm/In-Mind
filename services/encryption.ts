
// Encryption Utility Service
// v2.1: Fixed UTF-8 (Chinese) encoding support using URI component encoding

const SALT = 'hidden_thoughts_salt_v1';

/**
 * Generates a stable, unique 64-character Hex ID from the password.
 * Uses SHA-256 via Web Crypto API.
 * Asynchronous operation.
 */
export const hashPasscode = async (pass: string): Promise<string> => {
  const cleanPass = pass ? pass.trim() : "";
  if (cleanPass.length === 0) return "";

  const encoder = new TextEncoder();
  const data = encoder.encode(cleanPass + SALT);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

/**
 * Synchronous simple encryption for content payload.
 * FIX: Uses encodeURIComponent to handle Chinese characters correctly before XOR.
 */
export const simpleEncrypt = (text: string, pass: string): string => {
  try {
    const cleanPass = pass.trim();
    if (!cleanPass) return "";
    
    // FIX: Encode UTF-8 to safe ASCII URI format before processing
    // This prevents data loss for characters > code 255 (like Chinese)
    const safeText = encodeURIComponent(text);

    const textToChars = (t: string) => t.split("").map((c) => c.charCodeAt(0));
    const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code: number) => textToChars(cleanPass).reduce((a, b) => a ^ b, code);

    return safeText
      .split("")
      .map(c => c.charCodeAt(0))
      .map(applySaltToChar)
      .map(byteHex)
      .join("");
  } catch (e) {
    console.error("Encrypt failed", e);
    return "";
  }
};

export const simpleDecrypt = (encoded: string, pass: string): string => {
  try {
    const cleanPass = pass.trim();
    if (!cleanPass) return "";

    const textToChars = (t: string) => t.split("").map((c) => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(cleanPass).reduce((a, b) => a ^ b, code);
    
    const decryptedRaw = (encoded.match(/.{1,2}/g) || [])
      .map((hex) => parseInt(hex, 16))
      .map(applySaltToChar)
      .map((charCode) => String.fromCharCode(charCode))
      .join("");

    // FIX: Decode back to original UTF-8 string
    try {
      return decodeURIComponent(decryptedRaw);
    } catch (e) {
      // Fallback for legacy data (old English-only data might not be URI encoded)
      // If legacy data contained Chinese, it is likely already corrupted by the old algorithm
      return decryptedRaw;
    }
  } catch (e) {
    console.error("Decrypt failed", e);
    return "";
  }
};
