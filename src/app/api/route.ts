import { NextResponse } from "next/server";

/** `GET /api` in a browser (24 Nov 2026 route audit): the namespace itself has no page, so it points at the API docs. */
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/docs/api", request.url), 307);
}
