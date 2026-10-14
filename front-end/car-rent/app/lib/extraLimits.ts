export type ExtraLimitInput = {
  max_quantity?: number | string;
  id?: number;
  extra_id?: number;
  name?: string;
  charge_type?: "daily" | "once" | string;
};

export function getExtraMaxQuantity(extra: ExtraLimitInput): number {
  const limit = Number(extra.max_quantity);
  return Number.isInteger(limit) && limit >= 1 && limit <= 999 ? limit : 1;
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
