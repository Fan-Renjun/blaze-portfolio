import { createClient } from "@supabase/supabase-js";

// 使用 service_role key — 绕过 RLS，只在服务端使用
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
