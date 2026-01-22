import { auth } from "@/lib/auth";
import {
  summarizeEmails,
  categorizeEmails,
  generateSmartFilters,
  extractTasks,
  getErrorMessage,
  type EmailForAI,
} from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, emails } = body as {
      action: "summarize" | "categorize" | "filters" | "tasks";
      emails: EmailForAI[];
    };

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "No emails provided" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "summarize":
        result = await summarizeEmails(emails);
        break;
      case "categorize":
        result = await categorizeEmails(emails);
        break;
      case "filters":
        result = await generateSmartFilters(emails);
        break;
      case "tasks":
        result = await extractTasks(emails);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
