import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  start_temp: number;
  end_temp: number | null;
  max_temp: number | null;
  boiling_time_seconds: number | null;
  data_points: { time: string; temp: number }[];
  has_scale_warning: boolean;
}
