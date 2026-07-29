export type ExtraLimitInput = {
  id?: number;
  extra_id?: number;
  name?: string;
  charge_type?: "daily" | "once" | string;
};

const SEAT_EXTRA_IDS = new Set([4, 5]);

export function getExtraMaxQuantity(extra: ExtraLimitInput): number {
  const id = Number(extra.id ?? extra.extra_id ?? 0);
  const name = String(extra.name || "").toLowerCase();

  if (
    SEAT_EXTRA_IDS.has(id) ||
    name.includes("baby seat") ||
    name.includes("child seat")
  ) {
    return 3;
  }

  return 1;
}

export function clampExtraQuantity(
  extra: ExtraLimitInput,
  quantity: number
): number {
  const max = getExtraMaxQuantity(extra);
  const clean = Math.max(1, Math.floor(Number(quantity) || 1));
  return Math.min(max, clean);
}

export function isProtectionExtra(extra: ExtraLimitInput): boolean {
  const id = Number(extra.id ?? extra.extra_id ?? 0);
  return [1, 2, 3].includes(id);
}

export function isCombinedLocationExtra(extra: ExtraLimitInput): boolean {
  return Number(extra.id ?? extra.extra_id ?? 0) === 11;
}

export function isSingleLocationExtra(extra: ExtraLimitInput): boolean {
  return [9, 10].includes(Number(extra.id ?? extra.extra_id ?? 0));
}
