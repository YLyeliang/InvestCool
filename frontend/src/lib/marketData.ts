export interface NasdaqData {
  index: number;
  change: number;
  percent: number;
  last_update: string;
}

export interface MacroAsset {
  name: string;
  price: number;
  percent: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  percent: number;
}

const toFiniteNumber = (value: unknown) => {
  const numberValue = typeof value === "string" ? Number(value) : value;
  return typeof numberValue === "number" && Number.isFinite(numberValue) ? numberValue : null;
};

export const normalizeNasdaqData = (payload: unknown): NasdaqData | null => {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  const index = toFiniteNumber(data.index);
  const change = toFiniteNumber(data.change);
  const percent = toFiniteNumber(data.percent);

  if (index === null || change === null || percent === null) return null;

  return {
    index,
    change,
    percent,
    last_update: typeof data.last_update === "string" ? data.last_update : "",
  };
};

export const normalizeMacroAssets = (payload: unknown): MacroAsset[] => {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const data = item as Record<string, unknown>;
    const price = toFiniteNumber(data.price);
    const percent = toFiniteNumber(data.percent);

    if (typeof data.name !== "string" || price === null || percent === null) return [];

    return [{
      name: data.name,
      price,
      percent,
    }];
  });
};

export const normalizeTickers = (payload: unknown): TickerData[] => {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const data = item as Record<string, unknown>;
    const price = toFiniteNumber(data.price);
    const percent = toFiniteNumber(data.percent);

    if (typeof data.symbol !== "string" || price === null || percent === null) return [];

    return [{
      symbol: data.symbol,
      price,
      percent,
    }];
  });
};
