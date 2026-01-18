
// Encryption Utility Service
// v2.0: Upgraded to Web Crypto API (SHA-256) for ID stability

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
 * Keeps payload logic fast for UI rendering, while IDs use strong async hash.
 * ENFORCES pass.trim() for consistency.
 */
export const simpleEncrypt = (text: string, pass: string): string => {
  try {
    const cleanPass = pass.trim();
    if (!cleanPass) return "";

    const textToChars = (text: string) => text.split("").map((c) => c.charCodeAt(0));
    const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code: number) => textToChars(cleanPass).reduce((a, b) => a ^ b, code);

    return text
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

    const textToChars = (text: string) => text.split("").map((c) => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(cleanPass).reduce((a, b) => a ^ b, code);
    
    return (encoded.match(/.{1,2}/g) || [])
      .map((hex) => parseInt(hex, 16))
      .map(applySaltToChar)
      .map((charCode) => String.fromCharCode(charCode))
      .join("");
  } catch (e) {
    console.error("Decrypt failed", e);
    return "";
  }
};
