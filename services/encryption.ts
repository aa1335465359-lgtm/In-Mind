// A simple synchronous encryption utility.

const SALT = 'hidden_thoughts_salt_v1';

// We removed the hardcoded PRESET_SECRET_ENC because we now support multi-user registration.

export const hashPasscode = (pass: string): string => {
  const text = pass + SALT;
  let hash = 0;
  if (text.length === 0) return hash.toString();
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

export const simpleEncrypt = (text: string, pass: string): string => {
  try {
    const textToChars = (text: string) => text.split("").map((c) => c.charCodeAt(0));
    const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code: number) => textToChars(pass).reduce((a, b) => a ^ b, code);

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
    const textToChars = (text: string) => text.split("").map((c) => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(pass).reduce((a, b) => a ^ b, code);
    
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
