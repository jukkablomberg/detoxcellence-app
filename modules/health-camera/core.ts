/**
 * health-camera — the platform-free core of the studio's one camera engine.
 *
 * CANONICAL SOURCE: projects/fattonic/repo-app/modules/health-camera/. SnapStress and Detoxcellence get COPIES via
 * scripts/sync-camera-engine.mjs (EAS uploads only the project root, so a file: dependency would not build);
 * `node scripts/sync-camera-engine.mjs --check` fails on any drift. Edit here, never in a copy.
 *
 * Shared by the native classifier (index.native.ts), the web build and the Node acceptance test
 * (scripts/camera-classify.mjs), so every path ranks with exactly this code. Erasable TypeScript only
 * (Node runs it with --experimental-strip-types): no enums, no namespaces, no parameter properties.
 *
 * Model: Google SigLIP 2 base/16 at 224 px (Apache-2.0), image encoder only, uint8-quantised ONNX — see model.json
 * and docs/camera-engine.md. Label text embeddings are precomputed (label-emb.json); nothing is sent anywhere.
 */

export const INPUT = 224;
export const DIMS = 768;

export type Scored = { label: string; score: number };
export type LabelMeta = { id: string; name: string; lens: string[]; kind: "food" | "object" | "drink" };
export type EmbeddingFile = { model: string; dims: number; count: number; dtype: "float32"; ids: string[]; b64: string };

/** Pillow's BILINEAR kernel (a triangle); its support widens with the scale when downscaling, which is what
 * makes it anti-aliased. Measured on the VM with Pillow, so the phone must resample the same way. */
function coeffs(inSize: number, outSize: number): { bounds: Int32Array; weights: Float32Array[] } {
  const scale = inSize / outSize;
  const filterscale = Math.max(scale, 1);
  const support = 1.0 * filterscale;
  const bounds = new Int32Array(outSize * 2);
  const weights: Float32Array[] = [];
  for (let xx = 0; xx < outSize; xx++) {
    const center = (xx + 0.5) * scale;
    let xmin = Math.trunc(center - support + 0.5);
    if (xmin < 0) xmin = 0;
    let xmax = Math.trunc(center + support + 0.5);
    if (xmax > inSize) xmax = inSize;
    const n = xmax - xmin;
    const k = new Float32Array(n);
    let ww = 0;
    for (let x = 0; x < n; x++) {
      const t = Math.abs((x + xmin - center + 0.5) / filterscale);
      const w = t < 1 ? 1 - t : 0;
      k[x] = w;
      ww += w;
    }
    if (ww !== 0) for (let x = 0; x < n; x++) k[x] /= ww;
    bounds[xx * 2] = xmin;
    bounds[xx * 2 + 1] = n;
    weights.push(k);
  }
  return { bounds, weights };
}

/**
 * Pixels → the model's input: resample to size×size (no crop — the protocol squashes, as Siglip's processor does),
 * scale to [-1, 1] ((v/255 − 0.5)/0.5), planar NCHW float32. `px` is RGBA (channels 4, what jpeg-js returns) or RGB.
 */
export function toTensor(px: Uint8Array | Uint8ClampedArray, w: number, h: number, channels = 4, size = INPUT): Float32Array {
  const H = coeffs(w, size);
  const V = coeffs(h, size);
  // horizontal pass: h rows × size cols × 3
  const tmp = new Float32Array(h * size * 3);
  for (let y = 0; y < h; y++) {
    const row = y * w * channels;
    for (let xx = 0; xx < size; xx++) {
      const xmin = H.bounds[xx * 2], n = H.bounds[xx * 2 + 1], k = H.weights[xx];
      let r = 0, g = 0, b = 0;
      for (let x = 0; x < n; x++) {
        const o = row + (xmin + x) * channels;
        r += px[o] * k[x]; g += px[o + 1] * k[x]; b += px[o + 2] * k[x];
      }
      const t = (y * size + xx) * 3;
      tmp[t] = r; tmp[t + 1] = g; tmp[t + 2] = b;
    }
  }
  // vertical pass → NCHW, normalised
  const out = new Float32Array(3 * size * size);
  const plane = size * size;
  for (let yy = 0; yy < size; yy++) {
    const ymin = V.bounds[yy * 2], n = V.bounds[yy * 2 + 1], k = V.weights[yy];
    for (let xx = 0; xx < size; xx++) {
      let r = 0, g = 0, b = 0;
      for (let y = 0; y < n; y++) {
        const t = ((ymin + y) * size + xx) * 3;
        r += tmp[t] * k[y]; g += tmp[t + 1] * k[y]; b += tmp[t + 2] * k[y];
      }
      const o = yy * size + xx;
      out[o] = clamp255(r) / 127.5 - 1;
      out[plane + o] = clamp255(g) / 127.5 - 1;
      out[2 * plane + o] = clamp255(b) / 127.5 - 1;
    }
  }
  return out;
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function l2(v: Float32Array): Float32Array {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  const o = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) o[i] = v[i] / n;
  return o;
}

/** base64 → little-endian float32 matrix (count × dims). Every phone the apps support is little-endian. */
export function decodeEmbeddings(f: EmbeddingFile): Float32Array {
  const bin = atob(f.b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const m = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  if (m.length !== f.count * f.dims) throw new Error(`label-emb: expected ${f.count}×${f.dims}, got ${m.length}`);
  return m;
}

/**
 * Rank every label in the deployed label space by cosine similarity with the image embedding.
 * `protos` (optional, OFF by default): per-label mean embeddings of the reader's own confirmed scans, mixed in at
 * `alpha` (0.5 measured best in camera-lab leave-one-out, 2026-10-07). Kept on the device; never leaves it.
 * Imbalance warning (measured): prototypes for SOME labels and not others pull answers toward the boosted labels.
 */
export function rank(
  image: Float32Array,
  labels: Float32Array,
  ids: string[],
  k = 5,
  protos?: Record<string, Float32Array>,
  alpha = 0.5,
): Scored[] {
  const e = l2(image);
  const dims = e.length;
  const scored: Scored[] = [];
  for (let j = 0; j < ids.length; j++) {
    let row = labels.subarray(j * dims, (j + 1) * dims) as Float32Array;
    const p = protos?.[ids[j]];
    if (p) {
      const mix = new Float32Array(dims);
      const pn = l2(p);
      for (let i = 0; i < dims; i++) mix[i] = row[i] + alpha * pn[i];
      row = l2(mix);
    }
    let s = 0;
    for (let i = 0; i < dims; i++) s += row[i] * e[i];
    scored.push({ label: ids[j], score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
