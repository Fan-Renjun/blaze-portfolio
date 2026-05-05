import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/admin", "/protected"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only enforce auth on protected routes; everywhere else just refresh cookies
  const needsAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return updateSession(request, needsAuth);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
