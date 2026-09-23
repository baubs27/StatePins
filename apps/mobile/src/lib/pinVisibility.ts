import { Pin } from "@/types";

export const PIN_MAP_UPVOTE_THRESHOLD = 250;
export const PIN_MAP_GRACE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function pinAgeDays(pin: Pin, now = new Date()) {
  if (!pin.createdAt) return 0;
  const created = new Date(pin.createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / DAY_MS));
}

export function isFeaturedPin(pin: Pin) {
  return pin.upvotes >= PIN_MAP_UPVOTE_THRESHOLD;
}

export function isPinVisibleOnMap(pin: Pin, now = new Date()) {
  return isFeaturedPin(pin) || pinAgeDays(pin, now) <= PIN_MAP_GRACE_DAYS;
}

export function sortPinsForMap(a: Pin, b: Pin) {
  return b.upvotes - a.upvotes;
}
