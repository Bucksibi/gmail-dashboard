import { auth } from "@/lib/auth";
import { chatAboutEmails, suggestReply, type EmailForAI } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, message, emails, history, email, tone } = body as {
      action: "chat" | "reply";
      message?: string;
      emails?: EmailForAI[];
      history?: { role: "user" | "model"; content: string }[];
      email?: EmailForAI;
      tone?: "professional" | "casual" | "friendly";
    };

    if (action === "chat") {
      if (!message || !emails) {
        return NextResponse.json(
          { error: "Message and emails required" },
          { status: 400 }
        );
      }

      const response = await chatAboutEmails(message, emails, history || []);
      return NextResponse.json({ response });
    }

    if (action === "reply") {
      if (!email) {
        return NextResponse.json(
          { error: "Email required for reply suggestion" },
          { status: 400 }
        );
      }

      const response = await suggestReply(email, tone || "professional");
      return NextResponse.json({ response });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI chat failed",
      },
      { status: 500 }
    );
  }
}
