import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/", "/login", "/registro", "/recuperar-contrasena", "/feed", "/cursos", "/verificar", "/api/auth", "/simulador"];
const PROFESOR_ROUTES = ["/profesor"];
const ADMIN_ROUTES = ["/admin"];

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
  );

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (PROFESOR_ROUTES.some((r) => nextUrl.pathname.startsWith(r))) {
    if (!isLoggedIn || !["PROFESOR", "SUPERADMIN"].includes(userRole ?? "")) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  if (ADMIN_ROUTES.some((r) => nextUrl.pathname.startsWith(r))) {
    if (!isLoggedIn || !["SUPERADMIN", "MODERADOR"].includes(userRole ?? "")) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)"],
};
