/**
 * health-camera — web / Node stand-in. Classification runs only on the phone (classify.native.ts); the web export
 * has no camera model and shows the bundled demo result instead. Same exports, so TypeScript checks one API.
 */
import type { Scored } from "./core";

export const available = false;

export async function prepare(): Promise<void> {}

export function discard(_uri: string | null | undefined): void {}

export async function embed(_uri: string): Promise<Float32Array> {
  throw new Error("health-camera: the camera model runs on iOS and Android only");
}

export async function classify(_uri: string, _k = 5, _protos?: Record<string, Float32Array>): Promise<Scored[]> {
  throw new Error("health-camera: the camera model runs on iOS and Android only");
}
