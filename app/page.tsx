"use client";

import { WifiOff, Play, Square } from "lucide-react";
import { useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { Header } from "@/components/Header";
import { TemperatureGauge } from "@/components/TemperatureGauge";
import { TemperatureChart } from "@/components/TemperatureChart";
import { StatsGrid } from "@/components/StatsGrid";
import { useMqttSSE } from "@/hooks/useMqttSSE";
import { useSession } from "@/hooks/useSession";

export default function Home() {
  const {
    temperature,
    isConnected,
    lastUpdate,
    tempHistory,
    maxTemperature,
    avgTemp,
    error,
    rssi,
    deviceStatus,
  } = useMqttSSE();

  const {
    isSessionActive,
    startSession,
    stopSession,
    error: sessionError,
  } = useSession();



  const prevDeviceStatus = useRef(deviceStatus);

  useEffect(() => {
    if (
      isSessionActive &&
      prevDeviceStatus.current === "working" &&
      deviceStatus === "stopped"
    ) {
      console.log("🛑 Пристрій зупинено, завершуємо сесію...");
      const endTemp = tempHistory.length > 0 
        ? tempHistory[tempHistory.length - 1].temp 
        : temperature;
      stopSession(endTemp, maxTemperature, tempHistory).then(() => {
        sessionStorage.removeItem("temp_history");
        window.location.reload();
      });
    }
    prevDeviceStatus.current = deviceStatus;
  }, [deviceStatus, isSessionActive, temperature, maxTemperature, tempHistory, stopSession]);

  const handleSessionToggle = async () => {
    if (isSessionActive) {
      const endTemp = tempHistory.length > 0 
        ? tempHistory[tempHistory.length - 1].temp 
        : temperature;
      await stopSession(endTemp, maxTemperature, tempHistory);
      sessionStorage.removeItem("temp_history");
      window.location.reload();
    } else {
      await startSession(temperature);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {error && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Помилка підключення до MQTT</AlertTitle>
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <TemperatureGauge temperature={temperature} isHeating={isSessionActive} />
            
            <Card>
              <CardHeader>
                <CardTitle>Керування</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleSessionToggle}
                  className="w-full"
                  size="lg"
                  variant={isSessionActive ? "destructive" : "default"}
                >
                  {isSessionActive ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Зупинити сесію
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Почати сесію
                    </>
                  )}
                </Button>
                
                {sessionError && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{sessionError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Статус пристрою</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Оновлено</span>
                  <span className="font-mono">
                    {lastUpdate ? lastUpdate.toLocaleTimeString("uk-UA") : "—"}
                  </span>
                </div>

                {rssi && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">WiFi сигнал</span>
                      <span className="font-mono">{rssi} dBm</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <StatsGrid
              maxTemperature={maxTemperature}
              avgTemp={avgTemp}
            />
            <TemperatureChart data={tempHistory} />
          </div>
        </div>
      </main>
    </div>
  );
}
