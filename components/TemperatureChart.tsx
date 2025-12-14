"use client";

import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TempDataPoint } from "@/lib/types";
import { useRef, useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface TemperatureChartProps {
  data: TempDataPoint[];
}

const VISIBLE_POINTS = 20;

export function TemperatureChart({ data }: TemperatureChartProps) {
  const [scrollPosition, setScrollPosition] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const hasScroll = data.length > VISIBLE_POINTS;
  const maxOffset = Math.max(0, data.length - VISIBLE_POINTS);
  const startIndex = hasScroll ? Math.round(scrollPosition * maxOffset) : 0;
  const visibleData = hasScroll ? data.slice(startIndex, startIndex + VISIBLE_POINTS) : data;

  useEffect(() => {
    if (scrollPosition > 0.9) {
      setScrollPosition(1);
    }
  }, [data.length, scrollPosition]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-4 h-4 text-blue-500" />
          Графік температури
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visibleData}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="displayTime" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "hsl(var(--card))" : "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#tempGradient)"
                name="Температура"
                unit="°C"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 px-1">
          <input
            type="range"
            min="0"
            max="100"
            value={scrollPosition * 100}
            onChange={(e) => setScrollPosition(Number(e.target.value) / 100)}
            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-12
              [&::-webkit-slider-thumb]:h-2
              [&::-webkit-slider-thumb]:bg-[#fa7315]
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:hover:bg-[#e56610]
              [&::-moz-range-thumb]:w-12
              [&::-moz-range-thumb]:h-2
              [&::-moz-range-thumb]:bg-[#fa7315]
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{data.length > 0 ? data[0].displayTime : ""}</span>
            <span>{data.length} точок</span>
            <span>{data.length > 0 ? data[data.length - 1].displayTime : ""}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
