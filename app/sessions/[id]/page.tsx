"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Thermometer, Activity, Droplets } from "lucide-react";
import Link from "next/link";
import { supabase, Session } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Header } from "@/components/Header";
import { useTheme } from "next-themes";

export default function SessionDetailPage() {
  const params = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    async function fetchSession() {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("Помилка:", error);
      } else {
        setSession(data);
      }
      setLoading(false);
    }

    if (params.id) fetchSession();
  }, [params.id]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("uk-UA");
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("uk-UA");
  };

  const formatDateTimeLong = (isoString: string) => {
    return new Date(isoString).toLocaleString("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const chartData = session?.data_points?.map((p: { time: string; temp: number }) => ({
    time: formatTime(p.time),
    temp: p.temp,
  })) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-6 text-muted-foreground">Завантаження...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-6 text-destructive">Сесію не знайдено</div>
      </div>
    );
  }

  const stats = [
    { 
      icon: Clock, 
      label: "Час кипіння", 
      value: formatDuration(session.boiling_time_seconds),
      color: "text-blue-500"
    },
    { 
      icon: Thermometer, 
      label: "Початок", 
      value: `${session.start_temp?.toFixed(1)}°C`,
      subtitle: formatDateTime(session.started_at),
      color: "text-green-500"
    },
    { 
      icon: Thermometer, 
      label: "Кінець", 
      value: session.end_temp ? `${session.end_temp.toFixed(1)}°C` : "—",
      subtitle: session.ended_at ? formatDateTime(session.ended_at) : "—",
      color: "text-orange-500"
    },
    { 
      icon: Thermometer, 
      label: "Максимум", 
      value: `${session.max_temp?.toFixed(1) || "—"}°C`,
      color: "text-red-500"
    },
    { 
      icon: Activity, 
      label: "Середня", 
      value: session.data_points?.length 
        ? `${(session.data_points.reduce((sum: number, p: any) => sum + p.temp, 0) / session.data_points.length).toFixed(1)}°C`
        : "—",
      color: "text-yellow-500"
    },
    { 
      icon: Droplets, 
      label: "Точок даних", 
      value: session.data_points?.length || 0,
      color: "text-purple-500"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/sessions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            Сесія {formatDateTimeLong(session.started_at)}
          </h1>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  <div>
                    <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Графік */}
        <Card>
          <CardHeader>
            <CardTitle>Графік температури</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
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
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Таблиця даних */}
        <Card>
          <CardHeader>
            <CardTitle>Всі дані ({session.data_points?.length || 0} точок)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Час</TableHead>
                    <TableHead>Температура</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.data_points?.map((point: { time: string; temp: number }, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>{formatTime(point.time)}</TableCell>
                      <TableCell className="font-mono">{point.temp}°C</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
