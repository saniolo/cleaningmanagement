import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Only /admin/** requires an authenticated ADMIN session. /app/[token]/**
// (employee dashboard) is intentionally outside this middleware: employees
// authenticate implicitly via their personal access-token link, not a
// session — see the approved plan's "Accesso dipendenti" decision.
export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;

    if (token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
