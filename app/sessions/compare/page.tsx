"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Header } from "@/components/Header";
import { supabase, Session } from "@/lib/supabase";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

function analyzeScaleWarning(sessions: Session[]): { 
  hasSlow: boolean; 
  slowSession: Session | null; 
  percentDiff: number;
  trend: 'improving' | 'stable' | 'degrading' | null;
  recommendation: string;
} {
  console.log('🔍 Analyzing sessions:', sessions.length);
  
  if (sessions.length < 2) {
    console.log('❌ Not enough sessions');
    return { hasSlow: false, slowSession: null, percentDiff: 0, trend: null, recommendation: '' };
  }
  
  const withBoilingTime = sessions.filter(s => s.boiling_time_seconds && s.boiling_time_seconds > 0);
  console.log('⏱️ Sessions with boiling time:', withBoilingTime.length, withBoilingTime.map(s => s.boiling_time_seconds));
  
  if (withBoilingTime.length < 2) {
    console.log('❌ Not enough sessions with boiling time');
    return { hasSlow: false, slowSession: null, percentDiff: 0, trend: null, recommendation: '' };
  }
  
  const avgStartTemp = withBoilingTime.reduce((sum, s) => sum + s.start_temp, 0) / withBoilingTime.length;
  console.log('🌡️ Avg start temp:', avgStartTemp);
  
  const similarSessions = withBoilingTime.filter(s => Math.abs(s.start_temp - avgStartTemp) <= 5);
  console.log('✅ Similar start temp sessions:', similarSessions.length, similarSessions.map(s => s.start_temp));
  
  if (similarSessions.length < 2) {
    console.log('❌ Start temps too different');
    return { hasSlow: false, slowSession: null, percentDiff: 0, trend: null, recommendation: '' };
  }
  
  const sorted = [...similarSessions].sort((a, b) => 
    new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
  
  let trend: 'improving' | 'stable' | 'degrading' | null = null;
  if (sorted.length >= 3) {
    const oldAvg = sorted.slice(0, -2).reduce((sum, s) => sum + (s.boiling_time_seconds || 0), 0) / (sorted.length - 2);
    const recentAvg = sorted.slice(-2).reduce((sum, s) => sum + (s.boiling_time_seconds || 0), 0) / 2;
    const trendDiff = (recentAvg - oldAvg) / oldAvg;
    
    if (trendDiff > 0.1) trend = 'degrading';
    else if (trendDiff < -0.1) trend = 'improving';
    else trend = 'stable';
    
    console.log(`📈 Trend: ${trend} (old avg: ${oldAvg.toFixed(0)}s, recent avg: ${recentAvg.toFixed(0)}s, diff: ${(trendDiff * 100).toFixed(1)}%)`);
  }
  
  const avgBoilingTime = similarSessions.reduce((sum, s) => sum + (s.boiling_time_seconds || 0), 0) / similarSessions.length;
  console.log('⏱️ Avg boiling time:', avgBoilingTime);
  
  const slowSession = similarSessions.find(s => {
    const diff = ((s.boiling_time_seconds || 0) - avgBoilingTime) / avgBoilingTime;
    console.log(`  Session ${s.boiling_time_seconds}s: diff = ${(diff * 100).toFixed(1)}%`);
    return diff >= 0.15;
  });
  
  let recommendation = '';
  if (trend === 'degrading') {
    recommendation = '⚠️ Час кипіння збільшується — рекомендуємо помити каструлю найближчим часом';
  } else if (slowSession) {
    const percentDiff = Math.round((((slowSession.boiling_time_seconds || 0) - avgBoilingTime) / avgBoilingTime) * 100);
    recommendation = `⚠️ Виявлено повільну сесію (+${percentDiff}%) — можливо є накип`;
  } else if (trend === 'improving') {
    recommendation = '✅ Час кипіння покращується — каструля чиста!';
  } else {
    recommendation = '✅ Час кипіння стабільний — все добре';
  }
  
  if (slowSession) {
    const percentDiff = Math.round((((slowSession.boiling_time_seconds || 0) - avgBoilingTime) / avgBoilingTime) * 100);
    console.log('🚨 SLOW SESSION FOUND!', slowSession.boiling_time_seconds, 'diff:', percentDiff + '%');
    return { hasSlow: true, slowSession, percentDiff, trend, recommendation };
  }
  
  console.log('✅ All sessions normal');
  return { hasSlow: false, slowSession: null, percentDiff: 0, trend, recommendation };
}

export default function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMode, setAutoMode] = useState(false);

  useEffect(() => {
    loadSessions();
    const ids = searchParams.get("ids")?.split(",") || [];
    setSelectedIds(ids);
  }, [searchParams]);

  async function loadSessions() {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("started_at", { ascending: false });
    setSessions(data || []);
    setLoading(false);
  }

  const toggleSession = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const autoSelectSessions = () => {
    console.log('🔍 Total sessions:', sessions.length);
    console.log('Sessions data:', sessions.map(s => ({
      date: s.started_at,
      boiling_time: s.boiling_time_seconds,
      start_temp: s.start_temp
    })));
    
    const withBoiling = sessions
      .filter(s => s.boiling_time_seconds && s.boiling_time_seconds > 0);
    
    console.log('✅ With boiling time:', withBoiling.length);
    
    if (withBoiling.length < 2) {
      alert(`Недостатньо сесій для аналізу (мінімум 2). Знайдено сесій з часом кипіння: ${withBoiling.length}`);
      return;
    }
    
    const avgTemp = withBoiling.reduce((sum, s) => sum + s.start_temp, 0) / withBoiling.length;
    const similar = withBoiling.filter(s => Math.abs(s.start_temp - avgTemp) <= 5);
    
    if (similar.length < 2) {
      alert('Сесії мають занадто різну початкову температуру');
      return;
    }
    
    const autoSelected = similar.slice(0, 7).map(s => s.id);
    setSelectedIds(autoSelected);
    setAutoMode(true);
  };

  const selectedSessions = sessions.filter(s => selectedIds.includes(s.id));
  const scaleAnalysis = analyzeScaleWarning(selectedSessions);
  
  console.log('Selected sessions:', selectedSessions.map(s => ({
    date: s.started_at,
    start_temp: s.start_temp,
    boiling_time: s.boiling_time_seconds
  })));
  console.log('Scale analysis:', scaleAnalysis);

  const chartData = selectedSessions.length > 0 ? (() => {
    const maxLength = Math.max(...selectedSessions.map(s => s.data_points?.length || 0));
    const data = [];
    
    for (let i = 0; i < maxLength; i++) {
      const point: any = { index: i };
      selectedSessions.forEach((session, idx) => {
        const dp = session.data_points?.[i];
        if (dp) {
          point[`session${idx}`] = dp.temp;
        }
      });
      data.push(point);
    }
    
    return data;
  })() : [];

  const formatBoilingTime = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/sessions")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Порівняння сесій</h1>
          </div>
          <Button onClick={autoSelectSessions} variant="default">
            ✨ Автоматичний аналіз
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Виберіть сесії (до 3)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {sessions.map(session => (
                <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent">
                  <Checkbox
                    checked={selectedIds.includes(session.id)}
                    onCheckedChange={() => toggleSession(session.id)}
                    disabled={!selectedIds.includes(session.id) && selectedIds.length >= 3}
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">
                      {new Date(session.started_at).toLocaleDateString("uk-UA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Час кипіння: {formatBoilingTime(session.boiling_time_seconds)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            {selectedSessions.length > 0 ? (
              <>
                {autoMode && scaleAnalysis.recommendation && (
                  <Alert variant={scaleAnalysis.trend === 'degrading' || scaleAnalysis.hasSlow ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Результат автоматичного аналізу</AlertTitle>
                    <AlertDescription>
                      {scaleAnalysis.recommendation}
                      {scaleAnalysis.trend && (
                        <div className="mt-2 text-xs">
                          Тренд: <strong>
                            {scaleAnalysis.trend === 'degrading' && '📉 Погіршення'}
                            {scaleAnalysis.trend === 'stable' && '➡️ Стабільно'}
                            {scaleAnalysis.trend === 'improving' && '📈 Покращення'}
                          </strong>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {!autoMode && scaleAnalysis.hasSlow && scaleAnalysis.slowSession && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Можливий накип!</AlertTitle>
                    <AlertDescription>
                      Сесія від{" "}
                      <strong>
                        {new Date(scaleAnalysis.slowSession.started_at).toLocaleDateString("uk-UA", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>{" "}
                      кипіла на <strong>{scaleAnalysis.percentDiff}% довше</strong> при схожій початковій температурі.
                      Рекомендуємо очистити каструлю від накипу.
                    </AlertDescription>
                  </Alert>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle>Порівняння графіків</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="index" label={{ value: "Точка даних", position: "insideBottom", offset: -5 }} />
                          <YAxis label={{ value: "°C", angle: -90, position: "insideLeft" }} />
                          <Tooltip />
                          <Legend />
                          {selectedSessions.map((session, idx) => (
                            <Area
                              key={session.id}
                              type="monotone"
                              dataKey={`session${idx}`}
                              stroke={COLORS[idx]}
                              fill={COLORS[idx]}
                              fillOpacity={0.2}
                              name={new Date(session.started_at).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}
                            />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-4">
                  {selectedSessions.map((session, idx) => {
                    const isSlow = scaleAnalysis.slowSession?.id === session.id;
                    return (
                    <Card 
                      key={session.id} 
                      style={{ borderLeft: `4px solid ${COLORS[idx]}` }}
                      className={isSlow ? "border-destructive" : ""}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>
                            {new Date(session.started_at).toLocaleDateString("uk-UA", {
                              day: "numeric",
                              month: "long",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isSlow && (
                            <span className="text-destructive text-xs">⚠️ Повільно</span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="text-muted-foreground">Час кипіння:</span>
                          <span className="font-mono font-semibold">{formatBoilingTime(session.boiling_time_seconds)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Початок:</span>
                          <span className="font-mono">{session.start_temp.toFixed(1)}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Кінець:</span>
                          <span className="font-mono">{session.end_temp?.toFixed(1) || "—"}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Максимум:</span>
                          <span className="font-mono">{session.max_temp?.toFixed(1) || "—"}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Точок:</span>
                          <span className="font-mono">{session.data_points?.length || 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )})}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Виберіть сесії для порівняння
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
