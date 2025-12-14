"use client";

import { useState, useEffect } from "react";
import { TempDataPoint } from "@/lib/types";

interface ESP32Data {
  temperature?: number;
  rssi?: number;
  status?: "working" | "stopped";
}

interface UseMqttSSEReturn {
  temperature: number;
  isConnected: boolean;
  lastUpdate: Date | null;
  tempHistory: TempDataPoint[];
  maxTemperature: number;
  avgTemp: string;
  error: string | null;
  rssi: number | null;
  deviceStatus: "working" | "stopped" | null;
}

const HISTORY_KEY = "temp_history";

export function useMqttSSE(): UseMqttSSEReturn {
  const [temperature, setTemperature] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tempHistory, setTempHistory] = useState<TempDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rssi, setRssi] = useState<number | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<"working" | "stopped" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setTempHistory(JSON.parse(saved));
      } catch {
        
      }
    }
  }, []);

  useEffect(() => {
    console.log('🔌 Підключення до SSE...');
    
    const eventSource = new EventSource('/api/mqtt');
    
    eventSource.onopen = () => {
      console.log('✅ SSE підключено');
      setIsConnected(true);
      setError(null);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('✅ MQTT брокер підключено');
          return;
        }
        
        if (data.type === 'error') {
          console.error('❌ Помилка:', data.message);
          setError(data.message);
          return;
        }
        
        const esp32Data = data as ESP32Data;
        console.log('📨 Дані з ESP32:', esp32Data);
        
        if (esp32Data.status) {
          setDeviceStatus(esp32Data.status);
        }
        
        if (esp32Data.rssi) setRssi(esp32Data.rssi);
        
        if (esp32Data.temperature !== undefined) {
          const temp = esp32Data.temperature;
          setTemperature(temp);
          setLastUpdate(new Date());
          
          const now = new Date();
          const isoTime = now.toISOString();
          const displayTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
          
          setTempHistory((prev) => {
            const newHistory = [
              ...prev,
              { time: isoTime, displayTime, temp: Math.round(temp * 10) / 10, index: prev.length }
            ];
            if (mounted) {
              sessionStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
            }
            return newHistory;
          });
        }
        
      } catch (err) {
        console.error('❌ Помилка парсингу:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('❌ SSE помилка:', err);
      setIsConnected(false);
      setError('Помилка підключення до сервера');
    };
    
    return () => {
      console.log('🔌 Відключення від SSE');
      eventSource.close();
    };
  }, []);

  const avgTemp = tempHistory.length > 0
    ? (tempHistory.reduce((sum, p) => sum + p.temp, 0) / tempHistory.length).toFixed(1)
    : temperature.toFixed(1);

  const maxTemp = tempHistory.length > 0
    ? Math.max(...tempHistory.map(p => p.temp))
    : temperature;

  return {
    temperature,
    isConnected,
    lastUpdate,
    tempHistory,
    maxTemperature: maxTemp,
    avgTemp,
    error,
    rssi,
    deviceStatus,
  };
}
