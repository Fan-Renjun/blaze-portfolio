import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // 验证登录态，未登录则拒绝
  const sb   = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { week_start, week_hours, total_km, note } = await req.json();

  if (!week_start || week_hours == null || total_km == null) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("fitness_stats").insert({
    week_start,
    week_hours: parseFloat(week_hours),
    total_km:   parseFloat(total_km),
    note:       note || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
