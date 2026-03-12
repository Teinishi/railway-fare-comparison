"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { FareKind, FarePoint } from "./stepFareChartMath";
import {
  buildNiceTicks,
  buildStepPath,
  clamp,
  decimalsForStep,
  fareAtDistance,
  maxFareInRange,
  niceCeil,
  seriesVisibleExtent,
} from "./stepFareChartMath";
import ChartInspector from "./ChartInspector";

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

export default function StepFareChart({ fareKind, series }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipId = useId();
  const [hoverKm, setHoverKm] = useState<number | null>(null);
  const [hoverSeriesId, setHoverSeriesId] = useState<string | null>(null);
  const [pinnedSeriesId, setPinnedSeriesId] = useState<string | null>(null);
  const DEFAULT_X_RANGE_KM = 50;
  const [zoomX, setZoomX] = useState<{ minKm: number; maxKm: number }>(() => ({
    minKm: 0,
    maxKm: DEFAULT_X_RANGE_KM,
  }));
  const [hoverZone, setHoverZone] = useState<"none" | "plot" | "xband">("none");
  const [interaction, setInteraction] = useState<
    | { kind: "select"; startPx: number; currentPx: number }
    | {
        kind: "xzoom";
        startPx: number;
        currentPx: number;
        startMinKm: number;
        startMaxKm: number;
      }
    | {
        kind: "pan";
        startPx: number;
        currentPx: number;
        startMinKm: number;
        startMaxKm: number;
      }
    | {
        kind: "pinch";
        startDistPx: number;
        startMidKm: number;
        startMinKm: number;
        startMaxKm: number;
      }
    | null
  >(null);

  const touchPointsRef = useRef<Map<number, { clientX: number; clientY: number }>>(
    new Map()
  );

  const [dims, setDims] = useState(() => ({
    w: 900,
    h: 480,
    m: { l: 64, r: 24, t: 16, b: 32 },
  }));

  // Make the viewBox match the rendered size so the content actually uses the extra height on mobile.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(320, Math.round(rect.width));
      const h = Math.max(320, Math.round(rect.height));
      setDims((prev) => {
        if (prev.w === w && prev.h === h) return prev;
        return { ...prev, w, h };
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = dims.w - dims.m.l - dims.m.r;
  const innerH = dims.h - dims.m.t - dims.m.b;
  const plotRect = {
    x: dims.m.l,
    y: dims.m.t,
    right: dims.m.l + innerW,
    bottom: dims.m.t + innerH,
  };

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;

    // Most robust mapping: respects CSS transforms and browser zoom.
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    }

    // Fallback: assumes linear scale between viewBox and rendered rect.
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scaleX = dims.w / rect.width;
    const scaleY = dims.h / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, [svgRef, dims]);

  const baseExtent = useMemo(() => {
    if (series.length === 0) return { minKm: 0, maxKm: DEFAULT_X_RANGE_KM };
    let maxKm = -Infinity;
    for (const s of series) {
      const ext = seriesVisibleExtent(s.fares, fareKind);
      if (!ext) continue;
      if (ext.endKm > maxKm) maxKm = ext.endKm;
    }
    if (!Number.isFinite(maxKm) || maxKm <= 0) {
      return { minKm: 0, maxKm: DEFAULT_X_RANGE_KM };
    }
    return { minKm: 0, maxKm: Math.max(maxKm, DEFAULT_X_RANGE_KM) };
  }, [fareKind, series]);

  const isDefaultView =
    Math.abs(zoomX.minKm - 0) < 1e-9 &&
    Math.abs(zoomX.maxKm - DEFAULT_X_RANGE_KM) < 1e-9;

  function resetToDefaultView() {
    setZoomX({ minKm: 0, maxKm: DEFAULT_X_RANGE_KM });
  }

  const domain = useMemo(() => {
    const minKm = clamp(zoomX.minKm, baseExtent.minKm, baseExtent.maxKm);
    const maxKm = clamp(zoomX.maxKm, baseExtent.minKm, baseExtent.maxKm);
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

  const canPan =
    domain.maxKm - domain.minKm < baseExtent.maxKm - baseExtent.minKm;

  const toX = (km: number) =>
    dims.m.l + ((km - domain.minKm) / (domain.maxKm - domain.minKm)) * innerW;
  const toY = (yen: number) =>
    dims.m.t + innerH - (yen / domain.maxFare) * innerH;

  const fromX = useCallback((px: number) => domain.minKm + ((px - dims.m.l) / innerW) * (domain.maxKm - domain.minKm), [domain, dims, innerW]);

  const ticks = useMemo(() => {
    const xTickCount = 6;
    const yTickCount = 6;
    const x: number[] = [];
    const y: number[] = [];
    const xt = buildNiceTicks(domain.minKm, domain.maxKm, xTickCount);
    x.push(...xt.ticks);
    for (let i = 0; i < yTickCount; i++) {
      y.push((domain.maxFare * i) / (yTickCount - 1));
    }
    return { x, y, xStep: xt.step };
  }, [domain.maxFare, domain.maxKm, domain.minKm]);

  const hoverValues = useMemo(() => {
    const km = hoverKm === null ? null : clamp(hoverKm, domain.minKm, domain.maxKm);
    return series.map((s) => {
      const yen = km === null ? null : fareAtDistance(s.fares, km, fareKind);
      return {
        id: s.id,
        label: `${s.companyName} / ${s.tableName}`,
        color: s.color,
        value: yen,
        unit: "円",
      };
    });
  }, [domain.maxKm, domain.minKm, fareKind, hoverKm, series]);

  // Avoid setState in an effect here: React can warn about cascading renders.
  // Instead, treat ids that are not present in `series` as inactive.
  const pinnedId = useMemo(
    () => (pinnedSeriesId && series.some((s) => s.id === pinnedSeriesId) ? pinnedSeriesId : null),
    [pinnedSeriesId, series]
  );
  const hoverId = useMemo(
    () => (hoverSeriesId && series.some((s) => s.id === hoverSeriesId) ? hoverSeriesId : null),
    [hoverSeriesId, series]
  );

  const activeSeriesId = pinnedId ?? hoverId;

  const seriesForRender = useMemo(() => {
    if (!activeSeriesId) return series;
    const idx = series.findIndex((s) => s.id === activeSeriesId);
    if (idx < 0) return series;
    return [...series.slice(0, idx), ...series.slice(idx + 1), series[idx]];
  }, [activeSeriesId, series]);

  function onMouseMove(e: MouseEvent<SVGSVGElement>) {
    if (interaction) return;
    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    const x = p.x;
    const y = p.y;

    const inPlotArea =
      x >= plotRect.x &&
      x <= plotRect.right &&
      y >= plotRect.y &&
      y <= plotRect.bottom;
    const inXAxisBand =
      x >= plotRect.x && x <= plotRect.right && y >= plotRect.bottom;

    setHoverZone(inXAxisBand ? "xband" : inPlotArea ? "plot" : "none");
    const xInner = clamp(x, dims.m.l, dims.w - dims.m.r);
    const km = fromX(xInner);
    setHoverKm(km);

    if (!pinnedId && inPlotArea) {
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const s of series) {
        const yen = fareAtDistance(s.fares, km, fareKind);
        if (yen === null) continue;
        const yy = toY(yen);
        const d = Math.abs(yy - y);
        if (d < bestDist) {
          bestDist = d;
          bestId = s.id;
        }
      }
      if (bestDist > 20) {
        bestId = null;
      }
      setHoverSeriesId(bestId);
    } else if (!pinnedId) {
      setHoverSeriesId(null);
    }
  }

  function onMouseLeave() {
    setHoverKm(null);
    setHoverZone("none");
    if (!pinnedId) setHoverSeriesId(null);
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (series.length === 0) return;
    const svg = svgRef.current;
    if (!svg) return;

    if (e.pointerType === "touch") {
      svg.setPointerCapture(e.pointerId);
      touchPointsRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      // Two-finger pinch anywhere => zoom (and pan) on X.
      if (touchPointsRef.current.size >= 2) {
        const pts = Array.from(touchPointsRef.current.values()).slice(0, 2);
        const p1 = clientToSvg(pts[0].clientX, pts[0].clientY);
        const p2 = clientToSvg(pts[1].clientX, pts[1].clientY);
        if (p1 && p2) {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.max(10, Math.hypot(dx, dy));
          const midX = (p1.x + p2.x) / 2;
          const midXInner = clamp(midX, dims.m.l, dims.w - dims.m.r);
          const startMinKm = domain.minKm;
          const startMaxKm = domain.maxKm;
          const startSpan = startMaxKm - startMinKm;
          const midKmRaw =
            startSpan <= 0.001
              ? (startMinKm + startMaxKm) / 2
              : startMinKm + ((midXInner - dims.m.l) / innerW) * startSpan;
          const midKm = clamp(midKmRaw, startMinKm, startMaxKm);

          svg.setPointerCapture(e.pointerId);
          setHoverKm(null);
          setInteraction({
            kind: "pinch",
            startDistPx: dist,
            startMidKm: midKm,
            startMinKm,
            startMaxKm,
          });
          e.preventDefault();
          return;
        }
      }
    }

    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    const x = p.x;
    const y = p.y;
    const xInner = clamp(x, dims.m.l, dims.w - dims.m.r);

    const inPlotArea =
      x >= plotRect.x &&
      x <= plotRect.right &&
      y >= plotRect.y &&
      y <= plotRect.bottom;
    const inXAxisBand =
      x >= plotRect.x && x <= plotRect.right && y >= plotRect.bottom;

    // Assignments:
    // - Shift+drag => zoom select (anywhere)
    // - X axis band drag => continuous zoom (right=in, left=out)
    // - Plot area drag => pan (only when zoomed in)
    const wantsSelectZoom = e.shiftKey;
    const wantsXBandZoom = !e.shiftKey && inXAxisBand;
    const wantsPan = !wantsSelectZoom && !wantsXBandZoom && inPlotArea;

    // Touch convenience: when not zoomed, a tap on the plot area sets the inspector target.
    if (e.pointerType === "touch" && wantsPan && !canPan) {
      setHoverZone("plot");
      setHoverKm(fromX(xInner));
      e.preventDefault();
      return;
    }

    if (wantsPan && !canPan) return;
    if (!wantsSelectZoom && !wantsXBandZoom && !wantsPan) return;

    svg.setPointerCapture(e.pointerId);
    setHoverKm(null);
    if (!pinnedId) setHoverSeriesId(null);

    if (wantsSelectZoom) {
      setInteraction({ kind: "select", startPx: xInner, currentPx: xInner });
    } else if (wantsXBandZoom) {
      setInteraction({
        kind: "xzoom",
        startPx: xInner,
        currentPx: xInner,
        startMinKm: domain.minKm,
        startMaxKm: domain.maxKm,
      });
    } else {
      setInteraction({
        kind: "pan",
        startPx: xInner,
        currentPx: xInner,
        startMinKm: domain.minKm,
        startMaxKm: domain.maxKm,
      });
    }
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (e.pointerType === "touch") {
      const existing = touchPointsRef.current.get(e.pointerId);
      if (existing) {
        touchPointsRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      }
    }

    if (!interaction) return;
    const svg = svgRef.current;
    if (!svg) return;

    if (interaction.kind === "pinch") {
      if (touchPointsRef.current.size < 2) return;
      const pts = Array.from(touchPointsRef.current.values()).slice(0, 2);
      const p1 = clientToSvg(pts[0].clientX, pts[0].clientY);
      const p2 = clientToSvg(pts[1].clientX, pts[1].clientY);
      if (!p1 || !p2) return;

      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.max(10, Math.hypot(dx, dy));
      const distFactor = interaction.startDistPx / dist; // pinch-out => zoom-in

      const fullSpan = baseExtent.maxKm - baseExtent.minKm;
      if (!Number.isFinite(fullSpan) || fullSpan <= 0.001) return;
      const minSpan = Math.max(fullSpan / 500, 0.05);

      const baseSpan = interaction.startMaxKm - interaction.startMinKm;
      const nextSpan = clamp(baseSpan * distFactor, minSpan, fullSpan);

      const midX = (p1.x + p2.x) / 2;
      const midXInner = clamp(midX, dims.m.l, dims.w - dims.m.r);
      // Pinch semantics:
      // - The km under the midpoint of the two fingers (anchor) should stay the same while moving fingers.
      // - The screen position of that midpoint can change (pan), so ratio must be derived from current midX.
      const ratioNow = clamp((midXInner - dims.m.l) / innerW, 0, 1);
      const anchorKm = interaction.startMidKm;

      let nextMin = anchorKm - ratioNow * nextSpan;
      nextMin = clamp(nextMin, baseExtent.minKm, baseExtent.maxKm - nextSpan);
      setZoomX({ minKm: nextMin, maxKm: nextMin + nextSpan });

      e.preventDefault();
      return;
    }

    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    const x = p.x;
    const xInner = clamp(x, dims.m.l, dims.w - dims.m.r);

    if (interaction.kind === "select") {
      setInteraction((prev) =>
        prev && prev.kind === "select"
          ? { kind: "select", startPx: prev.startPx, currentPx: xInner }
          : prev
      );
    } else if (interaction.kind === "xzoom") {
      const deltaPx = xInner - interaction.startPx;
      const baseSpan = interaction.startMaxKm - interaction.startMinKm;
      const fullSpan = baseExtent.maxKm - baseExtent.minKm;
      const minSpan = Math.max(fullSpan / 500, 0.05);

      // Right drag => zoom in (smaller span). Left drag => zoom out.
      const zoomFactor = Math.exp(-deltaPx / 240);
      const nextSpan = clamp(baseSpan * zoomFactor, minSpan, fullSpan);
      const center = (interaction.startMinKm + interaction.startMaxKm) / 2;
      let nextMin = center - nextSpan / 2;
      nextMin = clamp(nextMin, baseExtent.minKm, baseExtent.maxKm - nextSpan);
      setZoomX({ minKm: nextMin, maxKm: nextMin + nextSpan });

      setInteraction((prev) =>
        prev && prev.kind === "xzoom"
          ? { ...prev, currentPx: xInner }
          : prev
      );
    } else {
      const kmPerPx = (interaction.startMaxKm - interaction.startMinKm) / innerW;
      const deltaKm = (interaction.startPx - xInner) * kmPerPx;
      const range = interaction.startMaxKm - interaction.startMinKm;
      const minLimit = baseExtent.minKm;
      const maxLimit = baseExtent.maxKm;
      const nextMin = clamp(interaction.startMinKm + deltaKm, minLimit, maxLimit - range);
      setZoomX({ minKm: nextMin, maxKm: nextMin + range });
      setInteraction((prev) =>
        prev && prev.kind === "pan"
          ? { ...prev, currentPx: xInner }
          : prev
      );
    }
    e.preventDefault();
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    if (e.pointerType === "touch") {
      touchPointsRef.current.delete(e.pointerId);
    }
    if (!interaction) return;

    const svg = svgRef.current;
    if (svg) svg.releasePointerCapture(e.pointerId);
    const kind = interaction.kind;
    setInteraction(null);

    if (kind === "pinch") {
      e.preventDefault();
      return;
    }

    const startPx = interaction.startPx;
    const endPx = interaction.currentPx;

    if (kind === "select") {
      if (Math.abs(endPx - startPx) < 10) return; // ignore tiny drags
      const km1 = fromX(startPx);
      const km2 = fromX(endPx);
      const minKm = Math.min(km1, km2);
      const maxKm = Math.max(km1, km2);
      const clampedMin = clamp(minKm, baseExtent.minKm, baseExtent.maxKm);
      const clampedMax = clamp(maxKm, baseExtent.minKm, baseExtent.maxKm);
      if (clampedMax - clampedMin < 0.01) return;
      setZoomX({ minKm: clampedMin, maxKm: clampedMax });
    }

    // Touch convenience: a tap after a pan gesture updates the inspector target.
    if (e.pointerType === "touch" && kind === "pan") {
      if (Math.abs(endPx - startPx) < 8) {
        setHoverZone("plot");
        setHoverKm(fromX(endPx));
      }
    }
    e.preventDefault();
  }

  function onDoubleClick() {
    resetToDefaultView();
  }

  // Attach a non-passive wheel listener to allow preventDefault() without warnings.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handler = (e: WheelEvent) => {
      if (series.length === 0) return;
      const p = clientToSvg(e.clientX, e.clientY);
      if (!p) return;

      const x = p.x;
      const y = p.y;
      const inXAxisBand =
        x >= plotRect.x && x <= plotRect.right && y >= plotRect.bottom;
      if (!inXAxisBand) return;

      const fullSpan = baseExtent.maxKm - baseExtent.minKm;
      if (!Number.isFinite(fullSpan) || fullSpan <= 0.001) return;
      const minSpan = Math.max(fullSpan / 500, 0.05);

      const currentSpan = domain.maxKm - domain.minKm;
      const xClamped = clamp(x, dims.m.l, dims.w - dims.m.r);
      const kmAtCursor = clamp(fromX(xClamped), domain.minKm, domain.maxKm);
      const ratio = (kmAtCursor - domain.minKm) / currentSpan;

      // Wheel up (deltaY<0) => zoom in. Wheel down => zoom out.
      const factor = Math.exp(e.deltaY / 260);
      const nextSpan = clamp(currentSpan * factor, minSpan, fullSpan);

      let nextMin = kmAtCursor - ratio * nextSpan;
      nextMin = clamp(nextMin, baseExtent.minKm, baseExtent.maxKm - nextSpan);
      setZoomX({ minKm: nextMin, maxKm: nextMin + nextSpan });

      e.preventDefault();
    };

    svg.addEventListener("wheel", handler, { passive: false });
    return () => {
      svg.removeEventListener("wheel", handler);
    };
  }, [baseExtent.maxKm, baseExtent.minKm, clientToSvg, dims.m.l, dims.m.r, dims.w, domain.maxKm, domain.minKm, fromX, plotRect.bottom, plotRect.right, plotRect.x, series.length]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="text-sm font-semibold text-zinc-900">運賃グラフ</div>
        <div className="text-xs text-zinc-600">
          横軸: 距離(km) / 縦軸: 金額(円)
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-col min-h-105 sm:h-105 sm:min-h-0 rounded-xl bg-white"
      >
        <div className="m-3 pointer-events-auto flex items-center gap-2">
          <div className="rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs text-zinc-700 shadow-sm backdrop-blur">
            {zoomX.minKm.toFixed(2)}〜{zoomX.maxKm.toFixed(2)} km
          </div>
          {!isDefaultView ? (
            <button
              type="button"
              onClick={resetToDefaultView}
              className="rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs text-zinc-700 shadow-sm hover:bg-white backdrop-blur"
            >
              リセット
            </button>
          ) : null}
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          className={
            "touch-none grow w-full select-none " +
            (hoverZone === "xband"
              ? "cursor-ew-resize"
              : hoverZone === "plot"
                ? canPan
                  ? "cursor-grab"
                  : "cursor-crosshair"
                : "cursor-default")
          }
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          role="img"
          aria-label="運賃の距離別グラフ"
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={dims.m.l}
                y={dims.m.t}
                width={innerW}
                height={innerH}
              />
            </clipPath>
          </defs>

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
                  {t.toFixed(decimalsForStep(ticks.xStep))}km
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
                  {Math.round(t)}円
                </text>
              </g>
            ))}
          </g>

          {/* Series */}
          <g clipPath={`url(#${clipId})`}>
            {seriesForRender.map((s) => {
              const isActive = activeSeriesId !== null && s.id === activeSeriesId;
              const isDim = activeSeriesId !== null && s.id !== activeSeriesId;
              const d = buildStepPath(s.fares, fareKind, toX, toY);
              return (
                <path
                  key={s.id}
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={isActive ? 4 : isDim ? 2 : 3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={isActive ? 0.95 : isDim ? 0.15 : 0.7}
                />
              );
            })}
          </g>

          {/* Hover crosshair */}
          {hoverKm !== null ? (
            <g clipPath={`url(#${clipId})`}>
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
          {interaction && interaction.kind === "select" ? (
            <g clipPath={`url(#${clipId})`}>
              {(() => {
                const x1 = Math.min(interaction.startPx, interaction.currentPx);
                const x2 = Math.max(interaction.startPx, interaction.currentPx);
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

        {series.length === 0 ? (
          <div className="absolute inset-0 top-7.5 grid place-items-center">
            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
              表示する路線を選択してください
            </div>
          </div>
        ) : null}
      </div>

      <ChartInspector
        message={hoverKm === null ? "グラフにホバーで金額表示" : `${hoverKm.toFixed(2)} km`}
        hoverValues={hoverValues}
        noValuesMessage="表示する路線を選択してください"
        activeId={activeSeriesId}
        pinnedId={pinnedId}
        onHoverId={(id) => {
          if (pinnedId) return;
          setHoverSeriesId(id);
        }}
        onTogglePin={(id) => {
          setPinnedSeriesId((prev) => (prev === id ? null : id));
        }}
      />
    </div>
  );
}
