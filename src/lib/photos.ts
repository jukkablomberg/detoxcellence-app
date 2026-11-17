import { labelPhoto } from "../../modules/health-camera";
import lens from "../data/lens-detoxcellence.json";
import credits from "../../assets/rooms/credits.json";
import type { RoomKey } from "./quiz";

/**
 * [DX-ROUND-1117] Real photos, never invented (the FatTonic rule, src/lib/photos.ts there):
 *  - an Index row's own picture = the camera's reference photo for the lens label that opens that row
 *    (modules/health-camera/label-photos — the open-licence set already credited in Credits & data);
 *    a row the camera does not know draws its score tile instead;
 *  - a ROOM's picture = assets/rooms (CC0 / public domain, Wikimedia Commons; EPA's vermiculite photo for older homes),
 *    credited in Credits & data from assets/rooms/credits.json. A room photo stands for the room, never for a rating.
 */
const bySlug = new Map<string, string>();
for (const [label, v] of Object.entries((lens as { map: Record<string, { row?: string; rows?: string[] }> }).map)) {
  for (const slug of v.row ? [v.row] : v.rows ?? []) if (!bySlug.has(slug)) bySlug.set(slug, label);
}

/** The row's own photo, or undefined. */
export function rowPhoto(slug: string): number | undefined {
  const label = bySlug.get(slug);
  return label ? labelPhoto(label) : undefined;
}

const ROOM_FILES = {
  home: require("../../assets/rooms/home.jpg"),
  kitchen: require("../../assets/rooms/kitchen.jpg"),
  living: require("../../assets/rooms/living.jpg"),
  laundry: require("../../assets/rooms/laundry.jpg"),
  attic: require("../../assets/rooms/attic.jpg"),
  garden: require("../../assets/rooms/garden.jpg"),
  water: require("../../assets/rooms/water.jpg"),
  older: require("../../assets/rooms/older.jpg"),
} as const;
export type RoomPhotoKey = keyof typeof ROOM_FILES;

export const HOME_PHOTO: number = ROOM_FILES.home;

/** The Home Check's six rooms (src/lib/quiz.ts RoomKey). */
const CHECK_ROOM: Record<RoomKey, RoomPhotoKey> = {
  older: "older",
  water: "water",
  kitchen: "kitchen",
  living: "living",
  structure: "attic",
  cleaning: "laundry",
};
export function checkRoomPhoto(k: RoomKey): number {
  return ROOM_FILES[CHECK_ROOM[k]];
}

/** The Index's eight rooms (the export's `room` field, src/lib/exposures.ts ROOMS). */
export function indexRoomPhoto(room: string): number | undefined {
  switch (room) {
    case "Water": return ROOM_FILES.water;
    case "Kitchen": return ROOM_FILES.kitchen;
    case "Living & bedrooms": return ROOM_FILES.living;
    case "Attic, structure & air": return ROOM_FILES.attic;
    case "Laundry & cleaning": return ROOM_FILES.laundry;
    case "Outdoors & garden": return ROOM_FILES.garden;
    case "Bathroom & personal care": return labelPhoto("object:shampoo-bottle");
    case "Food & drink": return labelPhoto("food:strawberries");
    default: return undefined;
  }
}

/** The two doors of the site's header: PFAS at home (a nonstick pan — PTFE is a PFAS) and Older homes (EPA's vermiculite). */
export const DOOR_PHOTO = {
  pfas: labelPhoto("object:nonstick-pan"),
  older: ROOM_FILES.older,
};

/** For Credits & data. */
export const ROOM_PHOTO_CREDITS = Object.entries((credits as { photos: Record<string, { title: string; author: string; licence: string; source: string }> }).photos).map(([id, c]) => ({ id, ...c }));
