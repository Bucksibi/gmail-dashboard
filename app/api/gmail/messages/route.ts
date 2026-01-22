import { auth } from "@/lib/auth";
import { getMessagesWithDetails } from "@/lib/gmail";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || undefined;
  const maxResults = parseInt(searchParams.get("maxResults") || "50", 10);
  const pageToken = searchParams.get("pageToken") || undefined;

  try {
    const data = await getMessagesWithDetails(
      session.accessToken,
      query,
      maxResults,
      pageToken
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Gmail API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch emails",
      },
      { status: 500 }
    );
  }
}
