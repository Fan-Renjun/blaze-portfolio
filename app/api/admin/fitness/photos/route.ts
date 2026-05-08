import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const caption  = (formData.get("caption") as string | null) || null;
    const taken_at = (formData.get("taken_at") as string | null) || null;

    if (!file) return NextResponse.json({ error: "未选择文件" }, { status: 400 });

    const supabase = createAdminClient();

    // 读取文件内容为 ArrayBuffer（Next.js API route 中更可靠）
    const buffer = await file.arrayBuffer();
    const ext    = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path   = `${Date.now()}.${ext}`;

    const contentType = file.type || `image/${ext}`;

    // 上传到 Storage Fitness bucket
    const { error: upErr } = await supabase.storage
      .from("Fitness")
      .upload(path, buffer, { contentType, upsert: true });

    if (upErr) {
      console.error("[fitness/photos] storage upload error:", upErr);
      return NextResponse.json({ error: `Storage: ${upErr.message}` }, { status: 500 });
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage.from("Fitness").getPublicUrl(path);

    // 写入 fitness_photos 表
    const { error: dbErr } = await supabase.from("fitness_photos").insert({
      photo_url: urlData.publicUrl,
      caption,
      taken_at:  taken_at || null,
    });

    if (dbErr) {
      console.error("[fitness/photos] db insert error:", dbErr);
      return NextResponse.json({ error: `DB: ${dbErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: urlData.publicUrl });
  } catch (err) {
    console.error("[fitness/photos] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
