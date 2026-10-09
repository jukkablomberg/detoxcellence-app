/** health-camera — public API. See docs/camera-engine.md. CANONICAL here; copies are drift-checked. */
export { INPUT, DIMS, toTensor, rank, l2, decodeEmbeddings } from "./core";
export type { Scored, LabelMeta, EmbeddingFile } from "./core";
export { classify, embed, prepare, discard, available } from "./classify";
import labelsFile from "./labels.json";
import type { LabelMeta } from "./core";

export const LABELS: LabelMeta[] = labelsFile.labels as LabelMeta[];
const byId = new Map(LABELS.map((l) => [l.id, l]));
export const labelMeta = (id: string): LabelMeta | undefined => byId.get(id);

// Reference photos for the "Is it…" chips (HEALTH-TRIO-DAY A9): one open-licence photo per label, or none.
import { LABEL_PHOTOS } from "./label-photos";
import photosFile from "./label-photos.json";
type PhotoMeta = { file: string; licence: string; licence_url: string; author: string; source_page: string } | null;
const PHOTO_META = photosFile.photos as Record<string, PhotoMeta>;
/** The bundled reference photo for a label (a require() asset id), or undefined when the label has none. */
export const labelPhoto = (id: string): number | undefined => LABEL_PHOTOS[id];
/** CC BY photos need a credit line; CC0 / PD do not. One line per credited photo, for About. */
export const labelPhotoCredits: { id: string; author: string; licence: string; url: string }[] = Object.entries(PHOTO_META)
  .filter((e): e is [string, NonNullable<PhotoMeta>] => !!e[1] && /^CC BY/.test(e[1].licence))
  .map(([id, m]) => ({ id, author: m.author, licence: m.licence, url: m.source_page }));
