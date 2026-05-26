import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getRetrievalDiagnostics } from "@/lib/ai/memory/diagnostics";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const privacyScope = searchParams.get("privacyScope") || "private";
    const characterBudget = Number(searchParams.get("characterBudget") || "8000");

    const diagnosticResult = await getRetrievalDiagnostics(
      user.id,
      query,
      privacyScope,
      characterBudget
    );

    return NextResponse.json(diagnosticResult);
  } catch (error: any) {
    console.error("Context diagnostics endpoint failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
