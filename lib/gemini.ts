import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export interface EmailForAI {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  body?: string;
}

export interface EmailCategory {
  id: string;
  category: "work" | "personal" | "promotions" | "social" | "updates" | "finance" | "travel" | "other";
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface EmailSummary {
  id: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "urgent";
}

export async function summarizeEmails(emails: EmailForAI[]): Promise<EmailSummary[]> {
  const prompt = `Analyze and summarize these emails. For each email, provide:
1. A brief summary (1-2 sentences)
2. Key points (bullet points)
3. Action items if any
4. Sentiment (positive, neutral, negative, or urgent)

Emails to analyze:
${emails.map((e, i) => `
--- Email ${i + 1} ---
From: ${e.from}
Subject: ${e.subject}
Date: ${e.date}
Content: ${e.body || e.snippet}
`).join("\n")}

Respond in JSON format:
{
  "summaries": [
    {
      "id": "email_id",
      "summary": "brief summary",
      "keyPoints": ["point1", "point2"],
      "actionItems": ["action1"],
      "sentiment": "neutral"
    }
  ]
}`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.summaries.map((s: EmailSummary, i: number) => ({
        ...s,
        id: emails[i]?.id || s.id,
      }));
    }
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
  }

  return [];
}

export async function categorizeEmails(emails: EmailForAI[]): Promise<EmailCategory[]> {
  const prompt = `Categorize these emails and assign priority levels. Categories: work, personal, promotions, social, updates, finance, travel, other.
Priority: high (needs immediate attention), medium (should address soon), low (can wait).

Emails:
${emails.map((e, i) => `
--- Email ${i + 1} (ID: ${e.id}) ---
From: ${e.from}
Subject: ${e.subject}
Snippet: ${e.snippet}
`).join("\n")}

Respond in JSON format:
{
  "categories": [
    {
      "id": "email_id",
      "category": "work",
      "priority": "high",
      "reason": "Brief explanation"
    }
  ]
}`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.categories;
    }
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
  }

  return [];
}

export async function generateSmartFilters(emails: EmailForAI[]): Promise<{
  suggestedFilters: { label: string; query: string; count: number }[];
  insights: string[];
}> {
  const prompt = `Analyze these emails and suggest useful filters/searches the user might want.
Also provide insights about their inbox.

Emails:
${emails.map((e) => `From: ${e.from} | Subject: ${e.subject}`).join("\n")}

Respond in JSON:
{
  "suggestedFilters": [
    { "label": "Urgent from Boss", "query": "from:boss@company.com is:important", "count": 3 }
  ],
  "insights": [
    "You have 5 unread emails from newsletters - consider unsubscribing",
    "3 emails require responses"
  ]
}`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
  }

  return { suggestedFilters: [], insights: [] };
}

export async function chatAboutEmails(
  message: string,
  emails: EmailForAI[],
  history: { role: "user" | "model"; content: string }[]
): Promise<string> {
  const chat = geminiModel.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: `You are an AI email assistant. Help the user manage their inbox. Here are their recent emails:\n\n${emails.map((e) => `- From: ${e.from}\n  Subject: ${e.subject}\n  Preview: ${e.snippet}\n  Date: ${e.date}\n`).join("\n")}\n\nBe helpful, concise, and actionable.` }],
      },
      {
        role: "model",
        parts: [{ text: "I'm ready to help you manage your emails! I can summarize emails, help you prioritize, find specific messages, suggest responses, or organize your inbox. What would you like to do?" }],
      },
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
    ],
  });

  const result = await chat.sendMessage(message);
  return result.response.text();
}

export async function suggestReply(email: EmailForAI, tone: "professional" | "casual" | "friendly" = "professional"): Promise<string> {
  const prompt = `Write a ${tone} reply to this email:

From: ${email.from}
Subject: ${email.subject}
Content: ${email.body || email.snippet}

Write only the reply body, no subject line or greeting repetition. Keep it concise and appropriate.`;

  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}

export async function extractTasks(emails: EmailForAI[]): Promise<{
  tasks: { task: string; source: string; deadline?: string; priority: "high" | "medium" | "low" }[];
}> {
  const prompt = `Extract actionable tasks from these emails:

${emails.map((e) => `
From: ${e.from}
Subject: ${e.subject}
Content: ${e.body || e.snippet}
`).join("\n---\n")}

Respond in JSON:
{
  "tasks": [
    {
      "task": "Description of task",
      "source": "Email subject or sender",
      "deadline": "Date if mentioned",
      "priority": "high/medium/low"
    }
  ]
}`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
  }

  return { tasks: [] };
}
