"use client";

import { TrendingUp, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsGridProps {
  maxTemperature: number;
  avgTemp: string;
}

export function StatsGrid({ maxTemperature, avgTemp }: StatsGridProps) {
  const stats = [
    { icon: TrendingUp, label: "Макс", value: `${maxTemperature.toFixed(1)}°` },
    { icon: Activity, label: "Середня", value: `${avgTemp}°` },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <stat.icon className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
