import { NextResponse } from "next/server";
import { DomainError } from "@/domain/errors";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error("Erreur serveur inattendue :", error);
  return NextResponse.json(
    {
      error: "Une erreur interne est survenue. Veuillez réessayer.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
