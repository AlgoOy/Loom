const IV_LENGTH = 12;

export async function encrypt(plaintext: string, secretBase64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await importKey(secretBase64);
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return `${toBase64(iv)}:${toBase64(new Uint8Array(cipher))}`;
}

export async function decrypt(ciphertext: string, secretBase64: string): Promise<string> {
  const [ivPart, dataPart] = ciphertext.split(':');
  if (!ivPart || !dataPart) throw new Error('Invalid ciphertext format');
  const iv = fromBase64(ivPart);
  const data = fromBase64(dataPart);
  const key = await importKey(secretBase64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plain);
}

async function importKey(secretBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(secretBase64), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
