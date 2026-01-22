import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classifyEmailsBatch, getErrorMessage, type EmailForAI } from "@/lib/gemini";

// GET - Get classifications for email IDs
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids")?.split(",").filter(Boolean);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "Missing email IDs" }, { status: 400 });
    }

    const classifications = await prisma.emailClassification.findMany({
      where: {
        userId: session.user.email,
        emailId: { in: ids },
      },
    });

    // Return as a map for easy lookup
    const classificationMap: Record<string, typeof classifications[0]> = {};
    for (const c of classifications) {
      classificationMap[c.emailId] = c;
    }

    return NextResponse.json({ classifications: classificationMap });
  } catch (error) {
    console.error("Failed to get classifications:", error);
    return NextResponse.json(
      { error: "Failed to get classifications" },
      { status: 500 }
    );
  }
}

// POST - Batch classify emails via AI
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emails, existingEmailIds } = (await request.json()) as {
      emails: EmailForAI[];
      existingEmailIds?: string[];
    };

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 });
    }

    // Limit batch size
    const emailsToClassify = emails.slice(0, 30);

    // Get existing classifications to avoid re-classifying
    const existingClassifications = await prisma.emailClassification.findMany({
      where: {
        userId: session.user.email,
        emailId: { in: emailsToClassify.map((e) => e.id) },
      },
    });

    const existingIds = new Set(existingClassifications.map((c) => c.emailId));
    const newEmails = emailsToClassify.filter((e) => !existingIds.has(e.id));

    if (newEmails.length === 0) {
      // All emails already classified, return existing
      const classificationMap: Record<string, typeof existingClassifications[0]> = {};
      for (const c of existingClassifications) {
        classificationMap[c.emailId] = c;
      }
      return NextResponse.json({ classifications: classificationMap, cached: true });
    }

    // Classify new emails with AI
    const results = await classifyEmailsBatch(newEmails, existingEmailIds);

    // Save to database
    const savedClassifications = await Promise.all(
      results.map((result) =>
        prisma.emailClassification.upsert({
          where: {
            emailId: result.id,
          },
          create: {
            emailId: result.id,
            userId: session.user!.email!,
            category: result.category,
            priority: result.priority,
            isRedundant: result.isRedundant,
            redundantOf: result.redundantOf || null,
            aiReason: result.reason,
            confidence: result.confidence,
            isManual: false,
          },
          update: {
            category: result.category,
            priority: result.priority,
            isRedundant: result.isRedundant,
            redundantOf: result.redundantOf || null,
            aiReason: result.reason,
            confidence: result.confidence,
          },
        })
      )
    );

    // Combine with existing classifications
    const allClassifications = [...existingClassifications, ...savedClassifications];
    const classificationMap: Record<string, typeof allClassifications[0]> = {};
    for (const c of allClassifications) {
      classificationMap[c.emailId] = c;
    }

    return NextResponse.json({ classifications: classificationMap });
  } catch (error) {
    console.error("Failed to classify emails:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

// PUT - Manually update a classification
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId, category, priority } = (await request.json()) as {
      emailId: string;
      category?: string;
      priority?: string;
    };

    if (!emailId) {
      return NextResponse.json({ error: "Missing email ID" }, { status: 400 });
    }

    const classification = await prisma.emailClassification.upsert({
      where: { emailId },
      create: {
        emailId,
        userId: session.user.email,
        category: category || "other",
        priority: priority || "medium",
        isManual: true,
      },
      update: {
        ...(category && { category }),
        ...(priority && { priority }),
        isManual: true,
      },
    });

    return NextResponse.json({ classification });
  } catch (error) {
    console.error("Failed to update classification:", error);
    return NextResponse.json(
      { error: "Failed to update classification" },
      { status: 500 }
    );
  }
}
