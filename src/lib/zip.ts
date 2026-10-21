/**
 * A minimal ZIP writer (stored entries, no compression): enough to hand a customer several finished
 * MP4s in one file without a dependency. Videos are already compressed, so "store" costs nothing.
 * Pure: takes entries as byte streams, yields the archive as chunks (streamable, ZIP64 not needed
 * below 4 GB; the caller limits the total size well under that).
 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array, seed = 0): number {
  let c = seed ^ 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; data: AsyncIterable<Uint8Array> | Iterable<Uint8Array>; size: number; modified?: Date };

function dosDateTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function u16(n: number) {
  return [n & 0xff, (n >>> 8) & 0xff];
}
function u32(n: number) {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

/** File names inside the archive: safe characters only, unique. */
export function safeZipName(name: string, taken = new Set<string>()) {
  let base = name.replace(/[\\/:*?"<>|\x00-\x1f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "video";
  if (!/\.[a-z0-9]{2,4}$/i.test(base)) base += ".mp4";
  let candidate = base;
  let i = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = base.replace(/(\.[a-z0-9]{2,4})$/i, ` (${i})$1`);
    i++;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** Yields the ZIP archive chunk by chunk, with data descriptors so sizes and CRCs are written after each entry. */
export async function* zipStream(entries: ZipEntry[]): AsyncGenerator<Uint8Array> {
  const enc = new TextEncoder();
  const central: Uint8Array[] = [];
  let offset = 0;
  const emit = (bytes: number[] | Uint8Array) => {
    const u = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    offset += u.length;
    return u;
  };
  for (const entry of entries) {
    const name = enc.encode(entry.name);
    const { time, date } = dosDateTime(entry.modified ?? new Date());
    const start = offset;
    // Local file header with bit 3 set: CRC and sizes follow the data.
    yield emit([...u32(0x04034b50), ...u16(20), ...u16(0x0808), ...u16(0), ...u16(time), ...u16(date), ...u32(0), ...u32(0), ...u32(0), ...u16(name.length), ...u16(0), ...name]);
    let crc = 0;
    let size = 0;
    for await (const chunk of entry.data as AsyncIterable<Uint8Array>) {
      crc = crc32(chunk, crc);
      size += chunk.length;
      yield emit(chunk);
    }
    yield emit([...u32(0x08074b50), ...u32(crc), ...u32(size), ...u32(size)]);
    central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0808), ...u16(0), ...u16(time), ...u16(date), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(start), ...name]));
  }
  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) {
    centralSize += c.length;
    yield emit(c);
  }
  yield emit([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length), ...u32(centralSize), ...u32(centralStart), ...u16(0)]);
}

/** Collects the stream into one buffer (tests and small archives). */
export async function zipToBuffer(entries: ZipEntry[]) {
  const parts: Uint8Array[] = [];
  for await (const chunk of zipStream(entries)) parts.push(chunk);
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
