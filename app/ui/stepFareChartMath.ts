export type FareKind = "ic" | "ticket";

export type FarePoint = {
  km: number;
  ic: number;
  ticket: number;
};

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function niceStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exp = Math.floor(Math.log10(rawStep));
  const base = 10 ** exp;
  const n = rawStep / base;
  if (n <= 1) return 1 * base;
  if (n <= 2) return 2 * base;
  if (n <= 2.5) return 2.5 * base;
  if (n <= 5) return 5 * base;
  return 10 * base;
}

export function decimalsForStep(step: number) {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = step.toString();
  if (s.includes("e-")) {
    const [, exp] = s.split("e-");
    return Math.min(6, Math.max(0, Number(exp) || 0));
  }
  const dot = s.indexOf(".");
  if (dot === -1) return 0;
  return Math.min(6, s.length - dot - 1);
}

export function buildNiceTicks(min: number, max: number, targetCount: number) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return { ticks: [min, max], step: 1 };

  const rawStep = span / Math.max(1, targetCount - 1);
  const step = niceStep(rawStep);
  const first = Math.ceil(min / step) * step;
  const last = Math.floor(max / step) * step;

  const ticks: number[] = [];
  if (Number.isFinite(first) && Number.isFinite(last) && first <= last) {
    for (let v = first; v <= last + step * 1e-9; v += step) {
      ticks.push(v);
      if (ticks.length > 200) break;
    }
  }

  if (ticks.length < 2) return { ticks: [min, max], step };
  return { ticks, step };
}

export function niceCeil(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const n = value / base;
  if (n <= 1) return base;
  if (n <= 1.2) return 1.2 * base;
  if (n <= 1.5) return 1.5 * base;
  return Math.ceil(n) * base;
}

export function fareValue(row: FarePoint, kind: FareKind): number | null {
  const v = kind === "ic" ? row.ic : row.ticket;
  return Number.isFinite(v) ? v : null;
}

export function seriesVisibleExtent(
  fares: FarePoint[],
  kind: FareKind
): { startKm: number; endKm: number } | null {
  let firstIndex = -1;
  let lastIndex = -1;

  for (let i = 0; i < fares.length; i++) {
    if (fareValue(fares[i], kind) !== null) {
      firstIndex = i;
      break;
    }
  }
  for (let i = fares.length - 1; i >= 0; i--) {
    if (fareValue(fares[i], kind) !== null) {
      lastIndex = i;
      break;
    }
  }

  if (firstIndex === -1 || lastIndex === -1) return null;

  const prevKm = firstIndex === 0 ? 0 : fares[firstIndex - 1]?.km;
  const startKm = Number.isFinite(prevKm) ? prevKm : 0;
  const endKm = fares[lastIndex]?.km;
  if (!Number.isFinite(endKm)) return null;
  return { startKm, endKm };
}

export function maxFareInRange(
  fares: FarePoint[],
  kind: FareKind,
  minKm: number,
  maxKm: number
): number | null {
  let max = -Infinity;
  for (let i = 0; i < fares.length; i++) {
    const row = fares[i];
    if (!Number.isFinite(row.km)) continue;
    const v = fareValue(row, kind);
    if (v === null) continue;

    const bracketStart = i === 0 ? 0 : fares[i - 1]?.km;
    const start = Number.isFinite(bracketStart) ? bracketStart : 0;
    const end = row.km;

    if (end < minKm || start > maxKm) continue;
    if (v > max) max = v;
  }
  return Number.isFinite(max) ? max : null;
}

export function fareAtDistance(
  fares: FarePoint[],
  km: number,
  kind: FareKind
): number | null {
  for (const row of fares) {
    if (km <= row.km) {
      const v = fareValue(row, kind);
      if (v !== null) return v;
    }
  }
  return null;
}

export function buildStepPath(
  fares: FarePoint[],
  kind: FareKind,
  toX: (km: number) => number,
  toY: (yen: number) => number
) {
  if (!fares.length) return "";
  let d = "";
  let hasActiveSegment = false;

  for (let i = 0; i < fares.length; i++) {
    const row = fares[i];
    if (!Number.isFinite(row.km)) continue;
    const v = fareValue(row, kind);
    if (v === null) {
      hasActiveSegment = false;
      continue;
    }

    const startKm = i === 0 ? 0 : fares[i - 1]?.km ?? 0;
    const endKm = row.km;
    const y = toY(v);

    if (!hasActiveSegment) {
      d += `M ${toX(startKm)} ${y}`;
      hasActiveSegment = true;
    }
    d += ` L ${toX(endKm)} ${y}`;

    const next = fares[i + 1];
    if (next) {
      const nextV = fareValue(next, kind);
      if (nextV !== null) {
        d += ` L ${toX(endKm)} ${toY(nextV)}`;
      } else {
        hasActiveSegment = false;
      }
    }
  }

  return d;
}
