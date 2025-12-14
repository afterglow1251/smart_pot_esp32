"use client";

import { ThermometerSun, AlertTriangle, Flame, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TemperatureGaugeProps {
  temperature: number;
  isHeating: boolean;
}

export function TemperatureGauge({ temperature, isHeating }: TemperatureGaugeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThermometerSun className="w-5 h-5" />
          Температура
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-6xl font-bold tabular-nums">
            {temperature.toFixed(1)}°C
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0°C</span>
            <span>100°C</span>
          </div>
          <Progress value={Math.min(temperature, 100)} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
