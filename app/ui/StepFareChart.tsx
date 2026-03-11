"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useMemo, useRef, useState } from "react";

type FareKind = "ic" | "ticket";

type FarePoint = {
  km: number;
  ic: number;
  ticket: number;
};

type Series = {
  id: string;
  companyName: string;
  tableName: string;
  fares: FarePoint[];
  color: string;
};

type Props = {
  fareKind: FareKind;
  series: Series[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function niceCeil(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const n = value / base;
  if (n <= 1) return 1 * base;
  if (n <= 2) return 2 * base;
  if (n <= 5) return 5 * base;
  return 10 * base;
}

function fareValue(row: FarePoint, kind: FareKind): number | null {
  const v = kind === "ic" ? row.ic : row.ticket;
  return Number.isFinite(v) ? v : null;
}

function seriesVisibleExtent(
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

function maxFareInRange(
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

    // Any overlap with [minKm, maxKm] counts.
    if (end < minKm || start > maxKm) continue;
    if (v > max) max = v;
  }
  return Number.isFinite(max) ? max : null;
}

function fareAtDistance(
  fares: FarePoint[],
  km: number,
  kind: FareKind
): number | null {
  for (const row of fares) {
    if (km <= row.km) {
      const v = fareValue(row, kind);
      if (v !== null) return v;
      // If this bracket is missing a value, keep searching for the first
      // bracket (at/after this distance) with a defined fare.
    }
  }
  for (let i = fares.length - 1; i >= 0; i--) {
    const v = fareValue(fares[i], kind);
    if (v !== null) return v;
  }
  return null;
}

function buildStepPath(
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

export default function StepFareChart({ fareKind, series }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverKm, setHoverKm] = useState<number | null>(null);
  const [zoomX, setZoomX] = useState<{ minKm: number; maxKm: number } | null>(
    null
  );
  const [selecting, setSelecting] = useState<{
    startPx: number;
    currentPx: number;
  } | null>(null);

  const dims = { w: 900, h: 480, m: { l: 64, r: 20, t: 18, b: 54 } };
  const innerW = dims.w - dims.m.l - dims.m.r;
  const innerH = dims.h - dims.m.t - dims.m.b;

  const baseExtent = useMemo(() => {
    if (series.length === 0) return { minKm: 0, maxKm: 10 };
    let minKm = Infinity;
    let maxKm = -Infinity;
    for (const s of series) {
      const ext = seriesVisibleExtent(s.fares, fareKind);
      if (!ext) continue;
      if (ext.startKm < minKm) minKm = ext.startKm;
      if (ext.endKm > maxKm) maxKm = ext.endKm;
    }
    if (!Number.isFinite(minKm) || !Number.isFinite(maxKm) || minKm >= maxKm) {
      return { minKm: 0, maxKm: 10 };
    }
    return { minKm, maxKm };
  }, [fareKind, series]);

  const domain = useMemo(() => {
    const minKm = zoomX ? clamp(zoomX.minKm, baseExtent.minKm, baseExtent.maxKm) : baseExtent.minKm;
    const maxKm = zoomX ? clamp(zoomX.maxKm, baseExtent.minKm, baseExtent.maxKm) : baseExtent.maxKm;
    const spanKm = Math.max(0.001, maxKm - minKm);

    let maxFareRaw = -Infinity;
    for (const s of series) {
      const v = maxFareInRange(s.fares, fareKind, minKm, maxKm);
      if (v !== null && v > maxFareRaw) maxFareRaw = v;
    }
    if (!Number.isFinite(maxFareRaw)) maxFareRaw = 200;

    return {
      minKm,
      maxKm: minKm + spanKm,
      maxFare: Math.max(1, niceCeil(maxFareRaw)),
    };
  }, [baseExtent.maxKm, baseExtent.minKm, fareKind, series, zoomX]);

  const toX = (km: number) =>
    dims.m.l + ((km - domain.minKm) / (domain.maxKm - domain.minKm)) * innerW;
  const toY = (yen: number) =>
    dims.m.t + innerH - (yen / domain.maxFare) * innerH;

  const fromX = (px: number) =>
    domain.minKm + ((px - dims.m.l) / innerW) * (domain.maxKm - domain.minKm);

  const ticks = useMemo(() => {
    const xTickCount = 6;
    const yTickCount = 6;
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < xTickCount; i++) {
      x.push(
        domain.minKm +
          ((domain.maxKm - domain.minKm) * i) / (xTickCount - 1)
      );
    }
    for (let i = 0; i < yTickCount; i++) {
      y.push((domain.maxFare * i) / (yTickCount - 1));
    }
    return { x, y };
  }, [domain.maxFare, domain.maxKm, domain.minKm]);

  const hoverValues = useMemo(() => {
    if (hoverKm === null) return null;
    const km = clamp(hoverKm, domain.minKm, domain.maxKm);
    return series.map((s) => ({
      id: s.id,
      label: `${s.companyName} / ${s.tableName}`,
      color: s.color,
      yen: fareAtDistance(s.fares, km, fareKind),
    }));
  }, [domain.maxKm, domain.minKm, fareKind, hoverKm, series]);

  function onMouseMove(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = dims.w / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const xInner = clamp(x, dims.m.l, dims.w - dims.m.r);
    const km = fromX(xInner);
    setHoverKm(km);
  }

  function onMouseLeave() {
    setHoverKm(null);
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!e.shiftKey) return;
    if (series.length === 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = dims.w / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const xInner = clamp(x, dims.m.l, dims.w - dims.m.r);
    svg.setPointerCapture(e.pointerId);
    setSelecting({ startPx: xInner, currentPx: xInner });
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!selecting) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = dims.w / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const xInner = clamp(x, dims.m.l, dims.w - dims.m.r);
    setSelecting((prev) => (prev ? { startPx: prev.startPx, currentPx: xInner } : prev));
    e.preventDefault();
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    if (!selecting) return;
    const svg = svgRef.current;
    if (svg) svg.releasePointerCapture(e.pointerId);
    const a = selecting.startPx;
    const b = selecting.currentPx;
    setSelecting(null);

    if (Math.abs(b - a) < 10) return; // ignore tiny drags
    const km1 = fromX(a);
    const km2 = fromX(b);
    const minKm = Math.min(km1, km2);
    const maxKm = Math.max(km1, km2);
    const clampedMin = clamp(minKm, baseExtent.minKm, baseExtent.maxKm);
    const clampedMax = clamp(maxKm, baseExtent.minKm, baseExtent.maxKm);
    if (clampedMax - clampedMin < 0.01) return;
    setZoomX({ minKm: clampedMin, maxKm: clampedMax });
    e.preventDefault();
  }

  function onDoubleClick() {
    setZoomX(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-zinc-900">運賃グラフ</div>
        <div className="text-xs text-zinc-600">
          横軸: 距離(km) / 縦軸: 金額(円)（Shift+ドラッグで拡大）
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          className="h-[420px] w-full select-none rounded-xl bg-white"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={onDoubleClick}
          role="img"
          aria-label="運賃の距離別グラフ"
        >
          {/* Grid + axes */}
          <g>
            {ticks.x.map((t) => (
              <line
                key={`xgrid-${t}`}
                x1={toX(t)}
                x2={toX(t)}
                y1={dims.m.t}
                y2={dims.h - dims.m.b}
                stroke="#E4E4E7"
                strokeWidth={1}
              />
            ))}
            {ticks.y.map((t) => (
              <line
                key={`ygrid-${t}`}
                x1={dims.m.l}
                x2={dims.w - dims.m.r}
                y1={toY(t)}
                y2={toY(t)}
                stroke="#E4E4E7"
                strokeWidth={1}
              />
            ))}

            <line
              x1={dims.m.l}
              x2={dims.w - dims.m.r}
              y1={dims.h - dims.m.b}
              y2={dims.h - dims.m.b}
              stroke="#A1A1AA"
              strokeWidth={1.5}
            />
            <line
              x1={dims.m.l}
              x2={dims.m.l}
              y1={dims.m.t}
              y2={dims.h - dims.m.b}
              stroke="#A1A1AA"
              strokeWidth={1.5}
            />

            {ticks.x.map((t) => (
              <g key={`xlabel-${t}`}>
                <text
                  x={toX(t)}
                  y={dims.h - dims.m.b + 22}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#52525B"
                >
                  {t.toFixed(t < 10 ? 1 : 0)}
                </text>
              </g>
            ))}
            {ticks.y.map((t) => (
              <g key={`ylabel-${t}`}>
                <text
                  x={dims.m.l - 10}
                  y={toY(t) + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#52525B"
                >
                  {Math.round(t)}
                </text>
              </g>
            ))}
          </g>

          {/* Series */}
          <g>
            {series.map((s) => {
              const d = buildStepPath(s.fares, fareKind, toX, toY);
              return (
                <path
                  key={s.id}
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={0.95}
                />
              );
            })}
          </g>

          {/* Hover crosshair */}
          {hoverKm !== null ? (
            <g>
              <line
                x1={toX(hoverKm)}
                x2={toX(hoverKm)}
                y1={dims.m.t}
                y2={dims.h - dims.m.b}
                stroke="#18181B"
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            </g>
          ) : null}

          {/* Zoom selection */}
          {selecting ? (
            <g>
              {(() => {
                const x1 = Math.min(selecting.startPx, selecting.currentPx);
                const x2 = Math.max(selecting.startPx, selecting.currentPx);
                const w = Math.max(1, x2 - x1);
                return (
                  <rect
                    x={x1}
                    y={dims.m.t}
                    width={w}
                    height={innerH}
                    fill="#18181B"
                    opacity={0.08}
                    stroke="#18181B"
                    strokeOpacity={0.35}
                    strokeWidth={1}
                  />
                );
              })()}
            </g>
          ) : null}
        </svg>

        {zoomX ? (
          <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2">
            <div className="rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs text-zinc-700 shadow-sm backdrop-blur">
              拡大中: {zoomX.minKm.toFixed(2)}〜{zoomX.maxKm.toFixed(2)} km
            </div>
            <button
              type="button"
              onClick={() => setZoomX(null)}
              className="rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs text-zinc-700 shadow-sm hover:bg-white backdrop-blur"
            >
              リセット
            </button>
          </div>
        ) : null}

        {hoverValues && hoverKm !== null ? (
          <div className="pointer-events-none absolute right-3 top-3 w-[280px] rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <div className="mb-2 text-xs font-semibold text-zinc-900">
              {hoverKm.toFixed(2)} km 時点
            </div>
            <div className="flex flex-col gap-1">
              {hoverValues.map((v) => (
                <div key={v.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: v.color }}
                  />
                  <div className="min-w-0 flex-1 truncate text-zinc-700">
                    {v.label}
                  </div>
                  <div className="tabular-nums text-zinc-950">
                    {v.yen === null ? "—" : `${v.yen}円`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {series.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
              右の一覧で表示する路線を選択してください
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {series.slice(0, 8).map((s) => (
          <div
            key={`legend-${s.id}`}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700"
            title={`${s.companyName} / ${s.tableName}`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="max-w-[260px] truncate">
              {s.companyName} / {s.tableName}
            </span>
          </div>
        ))}
        {series.length > 8 ? (
          <div className="rounded-full border border-dashed border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-600">
            +{series.length - 8} 件
          </div>
        ) : null}
      </div>
    </div>
  );
}
