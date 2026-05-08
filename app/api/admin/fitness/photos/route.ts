import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // 验证登录态，未登录则拒绝
  const sb   = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { fileBase64, fileName, caption, taken_at } = await req.json() as {
      fileBase64: string;
      fileName:   string;
      caption?:   string;
      taken_at?:  string;
    };

    if (!fileBase64 || !fileName) {
      return NextResponse.json({ error: "缺少文件数据" }, { status: 400 });
    }

    // base64 data URL → ArrayBuffer
    const base64Data = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
    const buffer     = Buffer.from(base64Data, "base64");
    const ext        = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const path       = `${Date.now()}.${ext}`;
    const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

    const supabase = createAdminClient();

    // 上传到 Storage Fitness bucket
    const { error: upErr } = await supabase.storage
      .from("Fitness")
      .upload(path, buffer, { contentType, upsert: true });

    if (upErr) {
      console.error("[fitness/photos] storage:", upErr);
      return NextResponse.json({ error: `Storage: ${upErr.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("Fitness").getPublicUrl(path);

    // 写入 fitness_photos 表
    const { error: dbErr } = await supabase.from("fitness_photos").insert({
      photo_url: urlData.publicUrl,
      caption:   caption  || null,
      taken_at:  taken_at || null,
    });

    if (dbErr) {
      console.error("[fitness/photos] db:", dbErr);
      return NextResponse.json({ error: `DB: ${dbErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: urlData.publicUrl });
  } catch (err) {
    console.error("[fitness/photos] unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
