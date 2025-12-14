"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Thermometer, Droplets, GitCompare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, Session } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("started_at", { ascending: false });

      if (error) {
        console.error("Помилка завантаження сесій:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
      } else {
        console.log("✅ Завантажено сесій:", data?.length || 0);
        setSessions(data || []);
      }
      setLoading(false);
    }

    fetchSessions();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("uk-UA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Історія сесій</h1>
          <Button onClick={() => router.push("/sessions/compare")} variant="outline">
            <GitCompare className="w-4 h-4 mr-2" />
            Порівняти
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Завантаження...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground">Сесій поки немає</p>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {formatDate(session.started_at)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-muted-foreground">Час кипіння</p>
                          <p className="font-semibold">{formatDuration(session.boiling_time_seconds)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-muted-foreground">Початок</p>
                          <p className="font-semibold">{session.start_temp?.toFixed(1)}°C</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-500" />
                        <div>
                          <p className="text-muted-foreground">Кінець</p>
                          <p className="font-semibold">{session.end_temp?.toFixed(1) || "—"}°C</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-purple-500" />
                        <div>
                          <p className="text-muted-foreground">Точок даних</p>
                          <p className="font-semibold">{session.data_points?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
