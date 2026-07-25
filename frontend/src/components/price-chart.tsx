'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  ColorType,
} from 'lightweight-charts';

export type ChartPoint = { time: number; value: number };

export function PriceChart({
  points,
  height = 320,
  lineColor = '#34d399',
}: {
  points: ChartPoint[];
  height?: number;
  lineColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: 'rgba(63,63,70,0.4)' },
        horzLines: { color: 'rgba(63,63,70,0.4)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(63,63,70,0.6)',
      },
      timeScale: {
        borderColor: 'rgba(63,63,70,0.6)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        horzLine: { color: '#52525b' },
        vertLine: { color: '#52525b' },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: `${lineColor}55`,
      bottomColor: `${lineColor}05`,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);
    chart.applyOptions({ width: containerRef.current.clientWidth });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, lineColor]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const data = points
      .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.value))
      .map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.value,
      }));
    seriesRef.current.setData(data);
    if (data.length) {
      chartRef.current.timeScale().fitContent();
    }
  }, [points]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/50"
      style={{ minHeight: height }}
    />
  );
}
