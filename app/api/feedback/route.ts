import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST - Submit feedback (thumbs up/down + optional issue)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { responseType, responseData, context, rating, issue } = body;

    // Validate required fields
    if (!responseType || !responseData || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating !== "up" && rating !== "down") {
      return NextResponse.json(
        { error: "Rating must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    const feedback = await prisma.aIFeedback.create({
      data: {
        userId: session.user.email,
        responseType,
        responseData: JSON.stringify(responseData),
        context: context || null,
        rating,
        issue: issue || null,
      },
    });

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error("Error saving feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}

// GET - Retrieve feedback stats (for future analytics)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const responseType = searchParams.get("responseType");

    const whereClause = responseType ? { responseType } : {};

    const [totalUp, totalDown, recentFeedback] = await Promise.all([
      prisma.aIFeedback.count({
        where: { ...whereClause, rating: "up" },
      }),
      prisma.aIFeedback.count({
        where: { ...whereClause, rating: "down" },
      }),
      prisma.aIFeedback.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          responseType: true,
          rating: true,
          issue: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUp,
        totalDown,
        total: totalUp + totalDown,
        positiveRate: totalUp + totalDown > 0
          ? Math.round((totalUp / (totalUp + totalDown)) * 100)
          : 0,
      },
      recentFeedback,
    });
  } catch (error) {
    console.error("Error fetching feedback stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback stats" },
      { status: 500 }
    );
  }
}
