import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const caption  = formData.get("caption") as string | null;
  const taken_at = formData.get("taken_at") as string | null;

  if (!file) return NextResponse.json({ error: "未选择文件" }, { status: 400 });

  const supabase = createAdminClient();

  // 上传到 Storage Fitness bucket
  const ext  = file.name.split(".").pop();
  const path = `${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("Fitness")
    .upload(path, file, { upsert: true });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 获取公开 URL
  const { data: urlData } = supabase.storage.from("Fitness").getPublicUrl(path);

  // 写入 fitness_photos 表
  const { error: dbErr } = await supabase.from("fitness_photos").insert({
    photo_url: urlData.publicUrl,
    caption:   caption || null,
    taken_at:  taken_at || null,
  });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}
