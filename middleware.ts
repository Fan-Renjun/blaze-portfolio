import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/admin", "/protected"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only enforce auth on protected routes; everywhere else just refresh cookies
  const needsAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return updateSession(request, needsAuth);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static / _next/image  (Next.js assets)
     * - favicon.ico, sitemap.xml, robots.txt  (static files)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
