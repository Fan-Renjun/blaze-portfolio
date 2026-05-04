import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col gap-6 pt-10">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-foreground/60">
        Signed in as <span className="font-medium text-foreground">{data.claims.email}</span>
      </p>
    </div>
  );
}
