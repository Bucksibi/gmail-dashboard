import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
});

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// Retry wrapper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message.toLowerCase();

      // Only retry on transient errors (503, 429, network errors)
      const isRetryable =
        errorMessage.includes("503") ||
        errorMessage.includes("overloaded") ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("network") ||
        errorMessage.includes("timeout");

      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// User-friendly error messages
export function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("503") || message.includes("overloaded")) {
    return "The AI service is temporarily busy. Please try again in a moment.";
  }
  if (message.includes("429") || message.includes("rate limit")) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  if (message.includes("401") || message.includes("403")) {
    return "Authentication error. Please check your API key configuration.";
  }
  if (message.includes("404")) {
    return "AI model not found. Please check the model configuration.";
  }
  if (message.includes("network") || message.includes("timeout")) {
    return "Network error. Please check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}

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

  const result = await withRetry(() => geminiModel.generateContent(prompt));
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

  const result = await withRetry(() => geminiModel.generateContent(prompt));
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

  const result = await withRetry(() => geminiModel.generateContent(prompt));
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
  return withRetry(async () => {
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
  });
}

export async function suggestReply(email: EmailForAI, tone: "professional" | "casual" | "friendly" = "professional"): Promise<string> {
  const prompt = `Write a ${tone} reply to this email:

From: ${email.from}
Subject: ${email.subject}
Content: ${email.body || email.snippet}

Write only the reply body, no subject line or greeting repetition. Keep it concise and appropriate.`;

  const result = await withRetry(() => geminiModel.generateContent(prompt));
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

  const result = await withRetry(() => geminiModel.generateContent(prompt));
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

export interface EmailClassificationResult {
  id: string;
  category: "work" | "personal" | "promotions" | "alerts" | "urgent" | "newsletter" | "social" | "updates" | "finance" | "travel" | "other";
  priority: "high" | "medium" | "low";
  isRedundant: boolean;
  redundantOf?: string;
  reason: string;
  confidence: number;
}

export async function classifyEmailsBatch(
  emails: EmailForAI[],
  existingEmailIds?: string[]
): Promise<EmailClassificationResult[]> {
  const prompt = `Classify these emails into categories and assign priorities. Also detect redundant/duplicate emails.

Categories:
- work: Work-related emails, colleagues, clients, projects
- personal: Personal correspondence, friends, family
- promotions: Marketing emails, sales, discounts
- alerts: System alerts, notifications, security
- urgent: Time-sensitive, requires immediate attention
- newsletter: Newsletters, subscriptions, digests
- social: Social media notifications
- updates: Account updates, shipping, order confirmations
- finance: Banking, payments, invoices
- travel: Flight, hotel, travel bookings
- other: Doesn't fit other categories

Priority:
- high: Needs immediate attention, time-sensitive, important sender
- medium: Should address within a day or two
- low: Informational, can wait or be batched

For redundancy, if an email is a reply or follow-up that doesn't add new information, mark it redundant and reference the original.

Emails to classify:
${emails.map((e, i) => `
--- Email ${i + 1} (ID: ${e.id}) ---
From: ${e.from}
Subject: ${e.subject}
Date: ${e.date}
Content: ${e.snippet}
`).join("\n")}

${existingEmailIds?.length ? `\nExisting email IDs in inbox for redundancy reference: ${existingEmailIds.slice(0, 50).join(", ")}` : ""}

Respond in JSON format:
{
  "classifications": [
    {
      "id": "email_id_here",
      "category": "work",
      "priority": "high",
      "isRedundant": false,
      "redundantOf": null,
      "reason": "Brief explanation for classification",
      "confidence": 0.95
    }
  ]
}`;

  const result = await withRetry(() => geminiModel.generateContent(prompt));
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.classifications.map((c: EmailClassificationResult, i: number) => ({
        ...c,
        id: emails[i]?.id || c.id,
      }));
    }
  } catch (e) {
    console.error("Failed to parse Gemini classification response:", e);
  }

  return [];
}
