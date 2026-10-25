/** Pure logic: no browser globals, easy to test independently. */
export const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be'
]);

export function parseVideoInput(text) {
  const raw = String(text || '').trim();
  if (VIDEO_ID.test(raw)) return { id: raw, start: 0 };
  let url;
  try { url = new URL(/^(https?:\/\/)/i.test(raw) ? raw : `https://${raw}`); }
  catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || !HOSTS.has(url.hostname.toLowerCase())) return null;
  const host = url.hostname.toLowerCase();
  let id;
  if (host === 'youtu.be' || host === 'www.youtu.be') { const parts=url.pathname.split('/').filter(Boolean); if (parts.length !== 1) return null; id=parts[0]; }
  else {
    const bits = url.pathname.split('/').filter(Boolean);
    if (bits[0] === 'watch') id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(bits[0])) id = bits[1];
    else if (url.pathname === '/') id = url.searchParams.get('v');
  }
  if (!VIDEO_ID.test(id || '')) return null;
  const t = url.searchParams.get('t') || url.searchParams.get('start') || url.searchParams.get('time_continue');
  return { id, start: parseTime(t) ?? 0 };
}

export function parseTime(text) {
  if (typeof text === 'number') return Number.isFinite(text) && text >= 0 ? text : null;
  let raw = String(text ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  // 1h2m3.5s, 2m10s, 90s, 1h2m
  if (/^(?:(?:\d+(?:\.\d+)?)h)?(?:(?:\d+(?:\.\d+)?)m)?(?:(?:\d+(?:\.\d+)?)s)?$/.test(raw) && /[hms]/.test(raw)) {
    const groups = [...raw.matchAll(/(\d+(?:\.\d+)?)(h|m|s)/g)];
    const units = new Set(groups.map(x => x[2]));
    if (groups.length && units.size === groups.length && groups.map(x => x[0]).join('') === raw) {
      return groups.reduce((total, g) => total + Number(g[1]) * ({h:3600,m:60,s:1}[g[2]]), 0);
    }
  }
  if (raw.includes(':')) {
    const chunks = raw.split(':');
    if (chunks.length < 2 || chunks.length > 3 || chunks.some(x => !/^\d+(\.\d+)?$/.test(x))) return null;
    const numbers = chunks.map(Number);
    if (numbers.slice(1).some(n => n >= 60)) return null;
    return numbers.reduce((acc, n) => acc * 60 + n, 0);
  }
  return null;
}

export function formatTime(seconds, milliseconds = false) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const ticks = milliseconds ? Math.floor((seconds + 0.00001) * 1000) : Math.floor(seconds);
  const totalSecs = milliseconds ? Math.floor(ticks / 1000) : ticks;
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const basic = (hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : String(minutes).padStart(2, '0')) + `:${String(secs).padStart(2, '0')}`;
  return milliseconds ? basic + '.' + String(ticks % 1000).padStart(3, '0') : basic;
}

export function validSegment(a, b, duration = 0) {
  return Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b - a >= .30 && (!(duration > 0) || b <= duration + 0.25);
}

export function normalizeSpeed(speed) {
  const options = [0.25,0.5,0.75,1,1.25,1.5,1.75,2];
  return options.reduce((p, n) => Math.abs(n - speed) < Math.abs(p - speed) ? n : p, 1);
}

export function parseShare(search) {
  const p = new URLSearchParams(search);
  const id = p.get('v');
  if (!VIDEO_ID.test(id || '')) return null;
  const a = p.has('a') ? parseTime(p.get('a')) : null;
  const b = p.has('b') ? parseTime(p.get('b')) : null;
  const wantMode = p.get('mode');
  const mode = wantMode === 'segment' && validSegment(a,b) ? 'segment' : ['off','full'].includes(wantMode) ? wantMode : 'full';
  const rateRaw = Number(p.get('rate'));
  const rate = p.has('rate') && Number.isFinite(rateRaw) && rateRaw >= 0.25 && rateRaw <= 2 ? normalizeSpeed(rateRaw) : 1;
  return { id, a, b, mode, rate, start: a ?? 0 };
}

export function makeShareUrl(base, { id, a, b, mode, rate }) {
  if (!VIDEO_ID.test(id || '')) return null;
  const u = new URL(base);
  u.search = '';
  u.hash = '';
  u.searchParams.set('v', id);
  u.searchParams.set('mode', mode === 'segment' && validSegment(a,b) ? 'segment' : mode === 'off' ? 'off' : 'full');
  if (Number.isFinite(a) && a >= 0) u.searchParams.set('a', Number(a.toFixed(3)).toString());
  if (Number.isFinite(b) && b >= 0) u.searchParams.set('b', Number(b.toFixed(3)).toString());
  if (rate !== 1) u.searchParams.set('rate', String(rate));
  return u.toString();
}

export function atSegmentEnd(time, b, lastJumpAgeMs) {
  return Number.isFinite(time) && Number.isFinite(b) && time >= b - 0.05 && lastJumpAgeMs >= 450;
}
