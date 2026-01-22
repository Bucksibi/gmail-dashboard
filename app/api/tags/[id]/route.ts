import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT - Update tag
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name, color } = (await request.json()) as {
      name?: string;
      color?: string;
    };

    // Verify ownership
    const existing = await prisma.userTag.findFirst({
      where: {
        id,
        userId: session.user.email,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Validate color if provided
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: "Invalid color format. Use hex format (#RRGGBB)" },
        { status: 400 }
      );
    }

    const tag = await prisma.userTag.update({
      where: { id },
      data: {
        ...(name && { name: name.toLowerCase().trim() }),
        ...(color && { color }),
      },
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("Failed to update tag:", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

// DELETE - Delete tag
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.userTag.findFirst({
      where: {
        id,
        userId: session.user.email,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Delete associated email tags first
    await prisma.emailTag.deleteMany({
      where: { tagId: id },
    });

    // Delete the tag
    await prisma.userTag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
