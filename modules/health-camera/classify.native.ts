/**
 * health-camera — on-device classification (iOS + Android). CANONICAL in projects/fattonic/repo-app; copies are
 * drift-checked by scripts/sync-camera-engine.mjs --check. Nothing leaves the phone: the photo is read, resized,
 * embedded and discarded; no image is stored or sent.
 *
 * Path: photo → native resize to 448×448 (expo-image-manipulator) → JPEG decode (jpeg-js) → Pillow-identical
 * triangle resample to 224 + normalise (core.toTensor) → SigLIP 2 image encoder (onnxruntime-react-native) →
 * cosine vs the bundled label embeddings (core.rank). The 448 step keeps the native resampler's aliasing out of
 * the measured path: the last, measured resample is always core.toTensor.
 *
 * ONNX Runtime is required LAZILY, inside load(), never at import (HEALTH-TRIO-DAY A12): the package's binding calls
 * `install()` on its native module the moment it is imported, so a missing or unregistered module (Play vc 9: Android
 * autolinking skipped it) threw while the Scan tab loaded and killed the app at start-up. Now a missing module means
 * `available === false` → Scan offers search + the demo, and nothing can crash before the first scan.
 * `npm run check:native-link` fails on a top-level import here.
 */
import { NativeModules } from "react-native";
import type { InferenceSession } from "onnxruntime-react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import * as jpeg from "jpeg-js";
import { INPUT, decodeEmbeddings, rank, toTensor, type EmbeddingFile, type Scored } from "./core";
import embFile from "./label-emb.json";

// The 95 MB encoder is fetched and sha256-verified by scripts/fetch-camera-model.mjs before Metro bundles it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODEL: number = require("./model/vision_model_uint8.onnx");

const EMB = embFile as EmbeddingFile;
let session: Promise<InferenceSession> | null = null;

type Ort = typeof import("onnxruntime-react-native");
let ortMod: Ort | null = null;
/** The ONNX Runtime JS package, loaded on first use (its import calls the native install()). */
function ort(): Ort {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ortMod ??= require("onnxruntime-react-native") as Ort;
  return ortMod;
}
let labelMatrix: Float32Array | null = null;

function load(): Promise<InferenceSession> {
  if (!session) {
    session = (async () => {
      const { InferenceSession: Session } = ort();
      const asset = Asset.fromModule(MODEL);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      return Session.create(uri.replace(/^file:\/\//, ""));
    })();
    session.catch(() => {
      session = null;
    });
  }
  return session;
}

/** Warm the encoder (first load copies the model out of the bundle once). Safe to call repeatedly. */
export async function prepare(): Promise<void> {
  await load();
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Delete a photo file the camera or the resize step wrote. Privacy by construction: no image outlives its scan. */
export function discard(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* already gone, or not a file URI (e.g. a bundled asset) */
  }
}

/** Photo URI → 768-d image embedding (not normalised). The resized copy is deleted before this returns. */
export async function embed(uri: string): Promise<Float32Array> {
  const small = await manipulateAsync(uri, [{ resize: { width: INPUT * 2, height: INPUT * 2 } }], {
    base64: true,
    compress: 0.95,
    format: SaveFormat.JPEG,
  });
  const b64 = small.base64;
  discard(small.uri);
  if (!b64) throw new Error("health-camera: resize returned no pixels");
  const raw = jpeg.decode(b64ToBytes(b64), { useTArray: true, formatAsRGBA: true });
  const x = toTensor(raw.data, raw.width, raw.height, 4);
  const s = await load();
  const out = await s.run({ pixel_values: new (ort().Tensor)("float32", x, [1, 3, INPUT, INPUT]) });
  return out.pooler_output.data as Float32Array;
}

/** Photo URI → the top-k labels of the whole deployed label space, best first. The UI shows top-3 and asks. */
export async function classify(uri: string, k = 5, protos?: Record<string, Float32Array>): Promise<Scored[]> {
  labelMatrix ??= decodeEmbeddings(EMB);
  return rank(await embed(uri), labelMatrix, EMB.ids, k, protos);
}

/** The camera model can run only when ONNX Runtime's native module is linked into this binary. */
export const available: boolean = NativeModules.Onnxruntime != null;
