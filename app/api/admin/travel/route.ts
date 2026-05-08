import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { city, country, year, lat, lng, notes } = body;
  if (!city || !country || !year || lat == null || lng == null) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("travel_cities").insert({
    city, country,
    year: Number(year),
    lat:  parseFloat(lat),
    lng:  parseFloat(lng),
    notes: notes || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("travel_cities").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
