import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSupabaseSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  // Mode démo : pas de compte, les données restent dans le navigateur.
  if (!isSupabaseConfigured) {
    const { pathname } = request.nextUrl;
    if (pathname === "/login" || pathname === "/signup") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
