import { auth } from "@/lib/auth";
import { getFullMessage } from "@/lib/gmail";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await getFullMessage(session.accessToken, id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Gmail API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch email",
      },
      { status: 500 }
    );
  }
}
