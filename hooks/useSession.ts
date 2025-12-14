"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase, Session } from "@/lib/supabase";
import { TempDataPoint } from "@/lib/types";

const BOILING_TEMP = 90;
const SESSION_KEY = "active_session";

interface UseSessionReturn {
  isSessionActive: boolean;
  currentSession: Partial<Session> | null;
  startSession: (currentTemp: number) => Promise<void>;
  stopSession: (currentTemp: number, maxTemp: number, dataPoints: TempDataPoint[]) => Promise<void>;
  error: string | null;
}

export function useSession(): UseSessionReturn {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<Partial<Session> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionStartedAt = useRef<Date | null>(null);

  useEffect(() => {
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setCurrentSession(session);
        setIsSessionActive(true);
        sessionStartedAt.current = new Date(session.started_at);
        console.log("🔄 Відновлено активну сесію:", session.id);
      } catch (err) {
        console.error("❌ Помилка відновлення сесії:", err);
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const startSession = useCallback(async (currentTemp: number) => {
    try {
      setError(null);
      const now = new Date().toISOString();
      sessionStartedAt.current = new Date();

      const { data, error: dbError } = await supabase
        .from("sessions")
        .insert({
          started_at: now,
          start_temp: currentTemp,
          data_points: [],
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setCurrentSession(data);
      setIsSessionActive(true);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      console.log("✅ Сесію розпочато:", data.id);
    } catch (err) {
      console.error("❌ Помилка створення сесії:", err);
      setError("Не вдалося створити сесію");
    }
  }, []);

  const stopSession = useCallback(async (
    currentTemp: number,
    maxTemp: number,
    dataPoints: TempDataPoint[]
  ) => {
    if (!currentSession?.id) return;

    try {
      setError(null);
      const now = new Date();
      
      let boilingTimeSeconds: number | null = null;
      const boilingPoint = dataPoints.find(p => p.temp >= BOILING_TEMP);
      if (boilingPoint && sessionStartedAt.current) {
        boilingTimeSeconds = boilingPoint.index;
      }

      const { error: dbError } = await supabase
        .from("sessions")
        .update({
          ended_at: now.toISOString(),
          end_temp: currentTemp,
          max_temp: maxTemp,
          boiling_time_seconds: boilingTimeSeconds,
          data_points: dataPoints.map(p => ({ time: p.time, temp: p.temp })),
        })
        .eq("id", currentSession.id);

      if (dbError) throw dbError;

      console.log("✅ Сесію завершено, час кипіння:", boilingTimeSeconds, "сек");
      setCurrentSession(null);
      setIsSessionActive(false);
      sessionStartedAt.current = null;
      sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      console.error("❌ Помилка завершення сесії:", err);
      setError("Не вдалося завершити сесію");
    }
  }, [currentSession?.id]);

  return {
    isSessionActive,
    currentSession,
    startSession,
    stopSession,
    error,
  };
}
