import "server-only";

import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message = "Bad request") {
  return NextResponse.json({ message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ message }, { status: 403 });
}

export function conflict(message = "Conflict") {
  return NextResponse.json({ message }, { status: 409 });
}

export function tooManyRequests(message: string) {
  return NextResponse.json({ message }, { status: 429 });
}

export function locked(message = "Account temporarily locked") {
  return NextResponse.json({ message }, { status: 423 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ message }, { status: 500 });
}