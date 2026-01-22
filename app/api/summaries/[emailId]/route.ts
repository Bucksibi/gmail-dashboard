import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Retrieve saved summary for email
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId } = await params;

    const summary = await prisma.emailSummary.findUnique({
      where: { emailId },
    });

    if (!summary) {
      return NextResponse.json({ summary: null });
    }

    // Parse JSON fields
    return NextResponse.json({
      summary: {
        id: summary.id,
        emailId: summary.emailId,
        summary: summary.summary,
        keyPoints: JSON.parse(summary.keyPoints),
        actionItems: JSON.parse(summary.actionItems),
        sentiment: summary.sentiment,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}

// POST - Save/update summary for email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId } = await params;
    const body = await request.json();
    const { summary, keyPoints, actionItems, sentiment } = body;

    const savedSummary = await prisma.emailSummary.upsert({
      where: { emailId },
      update: {
        summary,
        keyPoints: JSON.stringify(keyPoints),
        actionItems: JSON.stringify(actionItems),
        sentiment,
      },
      create: {
        emailId,
        userId: session.user.email,
        summary,
        keyPoints: JSON.stringify(keyPoints),
        actionItems: JSON.stringify(actionItems),
        sentiment,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        id: savedSummary.id,
        emailId: savedSummary.emailId,
        summary: savedSummary.summary,
        keyPoints: JSON.parse(savedSummary.keyPoints),
        actionItems: JSON.parse(savedSummary.actionItems),
        sentiment: savedSummary.sentiment,
        createdAt: savedSummary.createdAt,
        updatedAt: savedSummary.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error saving summary:", error);
    return NextResponse.json(
      { error: "Failed to save summary" },
      { status: 500 }
    );
  }
}

// DELETE - Remove summary
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId } = await params;

    await prisma.emailSummary.delete({
      where: { emailId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting summary:", error);
    return NextResponse.json(
      { error: "Failed to delete summary" },
      { status: 500 }
    );
  }
}
