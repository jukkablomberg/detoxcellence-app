import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getIndex } from "./exposures";
import { latestDriver } from "./history";
import { plan, weekNumber, type ReminderSettings } from "./swap-plan";
export { plan, WEEKDAYS, WEEKS_AHEAD, type ReminderSettings } from "./swap-plan";

/**
 * NATIVE VALUE 2 of 3 ("swap reminders"), declared in venture.json and named in the store review notes.
 *
 * Once a week, on the day and hour the reader picks, ONE swap from the Exposure Index: the next entry in the
 * area their latest Exposure Score points to (worst-first), then the rest of the Index worst-first. LOCAL
 * notifications only — scheduled on the phone by expo-notifications; no push server, no token, nothing sent.
 * A weekly repeating trigger would repeat the same text, so the next WEEKS_AHEAD weeks are scheduled as dated
 * one-shot notifications, each with its own swap, and the plan is refilled every time the app opens.
 * The week's swap is a pure function of the date (weeks since 1970), so no "already sent" state is kept.
 */
export const CHANNEL_ID = "swaps";
const KEY = "detoxcellence.reminder.v1";
const ID_PREFIX = "swap-week-";
export const DEFAULT_SETTINGS: ReminderSettings = { on: false, weekday: 7, hour: 10 };

export async function readSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Partial<ReminderSettings>) : {};
    const weekday = Number.isInteger(s.weekday) && s.weekday! >= 1 && s.weekday! <= 7 ? s.weekday! : DEFAULT_SETTINGS.weekday;
    const hour = Number.isInteger(s.hour) && s.hour! >= 0 && s.hour! <= 23 ? s.hour! : DEFAULT_SETTINGS.hour;
    return { on: s.on === true, weekday, hour };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let handlerInstalled = false;
export function installForegroundHandler(): void {
  if (handlerInstalled || Platform.OS === "web") return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Weekly swap",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    vibrationPattern: [0, 120],
  });
}

export async function hasPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const s = await Notifications.getPermissionsAsync();
  return s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Asked only when the reader switches the reminder ON — never at launch. */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (await hasPermission()) return true;
  const s = await Notifications.requestPermissionsAsync();
  return s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function cancelAll(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith(ID_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/** Make the phone's schedule match the settings: cancel ours, then (if on and permitted) schedule the plan. */
export async function applyReminder(s: ReminderSettings): Promise<number> {
  if (Platform.OS === "web") return 0;
  await cancelAll();
  if (!s.on || !(await hasPermission())) return 0;
  await ensureChannel();
  const items = plan(getIndex().list, await latestDriver(), s);
  for (const { date, entry } of items) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${weekNumber(date)}`,
      content: {
        title: `This week's swap: ${entry.name}`,
        body: entry.swap,
        data: { url: `/exposure/${entry.slug}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
  return items.length;
}

export async function saveSettings(s: ReminderSettings): Promise<number> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* the schedule below still applies this session */ }
  return applyReminder(s);
}

/** On launch: refill the plan (the next WEEKS_AHEAD weeks), so the reminders never run out while the app is used. */
export async function refillReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await applyReminder(await readSettings());
  } catch { /* scheduling refused: the Swaps tab shows the state */ }
}

/** How many of our reminders the phone actually holds — the Swaps tab shows it as evidence. */
export async function scheduledCount(): Promise<number> {
  if (Platform.OS === "web") return 0;
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier.startsWith(ID_PREFIX)).length;
  } catch {
    return 0;
  }
}
