// Church editor backend. The editor sends the church password here, never a GitHub token.
// The GitHub token lives only in Supabase secrets (GITHUB_EDITOR_TOKEN) and is used only for this repository.
const enc = new TextEncoder();
const GITHUB = 'https://api.github.com';
const SESSION_HOURS = 8;
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://zayaiken21.github.io').split(',').map(s => s.trim()).filter(Boolean);
const repo = (Deno.env.get('GITHUB_REPO') || '').trim();
const gateUrl = Deno.env.get('GATE_URL') || '';

const fromB64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

function sameBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function passwordIsRight(password: string) {
  const gate = await (await fetch(gateUrl)).json();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(gate.salt), iterations: gate.iterations }, key, 256));
  return sameBytes(bits, fromB64(gate.hash));
}

async function hmacKey() {
  return crypto.subtle.importKey('raw', enc.encode(Deno.env.get('SESSION_SECRET') || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function makeSession() {
  const expires = String(Date.now() + SESSION_HOURS * 3600 * 1000);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(expires)));
  return expires + '.' + toB64(signature);
}

async function sessionIsValid(session: string) {
  const [expires, signature] = String(session || '').split('.');
  if (!expires || !signature || Date.now() > Number(expires)) return false;
  try {
    return await crypto.subtle.verify('HMAC', await hmacKey(), fromB64(signature), enc.encode(expires));
  } catch {
    return false;
  }
}

function pathIsAllowed(path: string) {
  const lower = path.toLowerCase();
  const base = '/repos/' + repo.toLowerCase();
  return !path.includes('..') && (lower === '/user' || lower === base || lower.startsWith(base + '/'));
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  const reply = (body: unknown, code = 200) => new Response(JSON.stringify(body), { status: code, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (!allowedOrigins.includes(origin)) return reply({ error: 'This website is not allowed to use the editor.' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  if (!repo || !gateUrl || !Deno.env.get('GITHUB_EDITOR_TOKEN') || !Deno.env.get('SESSION_SECRET')) return reply({ error: 'The editor backend is not fully set up yet.' }, 500);

  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > 2_000_000) return reply({ error: 'Request too large.' }, 413);
    body = JSON.parse(raw);
  } catch {
    return reply({ error: 'Invalid request.' }, 400);
  }

  if (body.action === 'login') {
    if (typeof body.password !== 'string' || body.password.trim().length === 0 || body.password.length > 200) return reply({ error: 'Enter the church editor password.' }, 400);
    await new Promise(r => setTimeout(r, 1000)); // slows down guessing
    if (!await passwordIsRight(body.password.trim())) return reply({ error: 'The church editor password is not correct. Check it with the church owner and try again.' }, 401);
    return reply({ session: await makeSession() });
  }

  if (body.action === 'api') {
    if (!await sessionIsValid(body.session)) return reply({ error: 'Your editor session ended. Sign in again with the church editor password.' }, 401);
    const method = String(body.method || 'GET').toUpperCase();
    if (!['GET', 'POST', 'PATCH'].includes(method)) return reply({ error: 'Method not allowed.' }, 405);
    const path = String(body.path || '');
    if (!pathIsAllowed(path)) return reply({ error: 'This request is not allowed.' }, 403);
    const hasBody = body.body !== undefined && body.body !== null;
    const upstream = await fetch(GITHUB + path, {
      method,
      headers: { Authorization: 'Bearer ' + Deno.env.get('GITHUB_EDITOR_TOKEN'), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(hasBody ? { 'Content-Type': 'application/json' } : {}) },
      ...(hasBody ? { body: JSON.stringify(body.body) } : {}),
    });
    if (upstream.status === 204) return new Response(null, { status: 204, headers: cors });
    return new Response(await upstream.text(), { status: upstream.status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  return reply({ error: 'Unknown request.' }, 400);
});
