import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Get tags for email
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId } = await params;

    const emailTags = await prisma.emailTag.findMany({
      where: { emailId },
    });

    // Get the actual tag details
    const tagIds = emailTags.map((et) => et.tagId);
    const tags = await prisma.userTag.findMany({
      where: {
        id: { in: tagIds },
        userId: session.user.email,
      },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Failed to get email tags:", error);
    return NextResponse.json(
      { error: "Failed to get email tags" },
      { status: 500 }
    );
  }
}

// POST - Add tag to email
export async function POST(
  request: Request,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId } = await params;
    const { tagId } = (await request.json()) as { tagId: string };

    if (!tagId) {
      return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
    }

    // Verify tag ownership
    const tag = await prisma.userTag.findFirst({
      where: {
        id: tagId,
        userId: session.user.email,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Check if already tagged
    const existing = await prisma.emailTag.findFirst({
      where: { emailId, tagId },
    });

    if (existing) {
      return NextResponse.json({ emailTag: existing });
    }

    const emailTag = await prisma.emailTag.create({
      data: { emailId, tagId },
    });

    return NextResponse.json({ emailTag }, { status: 201 });
  } catch (error) {
    console.error("Failed to add tag to email:", error);
    return NextResponse.json(
      { error: "Failed to add tag to email" },
      { status: 500 }
    );
  }
}

// DELETE - Remove tag from email
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId } = await params;
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");

    if (!tagId) {
      return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
    }

    // Verify tag ownership
    const tag = await prisma.userTag.findFirst({
      where: {
        id: tagId,
        userId: session.user.email,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.emailTag.deleteMany({
      where: { emailId, tagId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove tag from email:", error);
    return NextResponse.json(
      { error: "Failed to remove tag from email" },
      { status: 500 }
    );
  }
}
