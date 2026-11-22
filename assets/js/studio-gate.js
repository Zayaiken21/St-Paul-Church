// Checks the church editor password against assets/studio/gate.json.
// The file holds only a salted PBKDF2-SHA256 hash, never the password itself.
// This keeps casual visitors out of the editor. Saving changes still requires a GitHub token with write access.
const toBytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

export async function checkEditorPassword(password) {
  const typed = String(password || '').trim();
  if (!typed) return false;
  if (!globalThis.crypto?.subtle) throw Error('This browser cannot check the editor password. Use a current version of Safari, Chrome or Edge.');
  const response = await fetch('assets/studio/gate.json', {cache: 'no-store'});
  if (!response.ok) throw Error('The editor password check is missing from the website. Ask the church owner to run the editor password update.');
  const gate = await response.json();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(typed), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: toBytes(gate.salt), iterations: gate.iterations}, key, 256);
  const got = new Uint8Array(bits);
  const want = toBytes(gate.hash);
  if (got.length !== want.length) return false;
  let difference = 0;
  for (let i = 0; i < got.length; i++) difference |= got[i] ^ want[i];
  return difference === 0;
}
