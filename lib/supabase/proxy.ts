import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest, needsAuth = false) {
  let supabaseResponse = NextResponse.next({ request });

  // Always create a fresh client per request (Fluid compute requirement)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not add any code between createServerClient and getClaims().
  // A simple mistake here can cause users to be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Only redirect to login when accessing a protected route without a session
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: Return supabaseResponse as-is to keep cookies in sync.
  return supabaseResponse;
}
