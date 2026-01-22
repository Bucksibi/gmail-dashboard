const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  labelIds?: string[];
  payload?: {
    headers: Array<{ name: string; value: string }>;
    mimeType?: string;
    body?: {
      data?: string;
      size?: number;
    };
    parts?: GmailMessagePart[];
  };
  internalDate?: string;
}

export interface GmailMessagePart {
  mimeType?: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessageList {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface FormattedEmail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  hasAttachment: boolean;
  labelIds: string[];
}

export async function listMessages(
  accessToken: string,
  query?: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<GmailMessageList> {
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
  });

  if (query) {
    params.set("q", query);
  }

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(
    `${GMAIL_API_BASE}/users/me/messages?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getMessage(
  accessToken: string,
  messageId: string,
  format: "metadata" | "full" = "metadata"
): Promise<GmailMessage> {
  const params = new URLSearchParams({
    format,
  });

  if (format === "metadata") {
    params.append("metadataHeaders", "From");
    params.append("metadataHeaders", "Subject");
    params.append("metadataHeaders", "Date");
    params.append("metadataHeaders", "To");
  }

  const response = await fetch(
    `${GMAIL_API_BASE}/users/me/messages/${messageId}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Fetch items in batches to avoid rate limiting
async function fetchInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

export async function getMessagesWithDetails(
  accessToken: string,
  query?: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<{
  messages: FormattedEmail[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}> {
  const list = await listMessages(accessToken, query, maxResults, pageToken);

  if (!list.messages || list.messages.length === 0) {
    return { messages: [], resultSizeEstimate: 0 };
  }

  // Fetch messages in batches to avoid rate limiting
  const messages = await fetchInBatches(
    list.messages,
    (msg) => getMessage(accessToken, msg.id, "metadata"),
    10 // 10 messages per batch
  );

  return {
    messages: messages.map((msg) => formatMessage(msg)),
    nextPageToken: list.nextPageToken,
    resultSizeEstimate: list.resultSizeEstimate,
  };
}

export async function getFullMessage(
  accessToken: string,
  messageId: string
): Promise<{
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  isHtml: boolean;
}> {
  const msg = await getMessage(accessToken, messageId, "full");

  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
    "";

  // Extract body
  const { body, isHtml } = extractBody(msg);

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    body,
    isHtml,
  };
}

function formatMessage(msg: GmailMessage): FormattedEmail {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
    "";

  const labelIds = msg.labelIds || [];
  const isUnread = labelIds.includes("UNREAD");

  // Check for attachments - look for parts with filename or attachment disposition
  const hasAttachment = checkForAttachments(msg.payload?.parts);

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: getHeader("From"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    snippet: msg.snippet,
    isUnread,
    hasAttachment,
    labelIds,
  };
}

function checkForAttachments(parts?: GmailMessagePart[]): boolean {
  if (!parts) return false;

  for (const part of parts) {
    // Check if this part has a filename or is an attachment
    if (
      part.mimeType &&
      !part.mimeType.startsWith("text/") &&
      !part.mimeType.startsWith("multipart/")
    ) {
      return true;
    }

    // Recursively check nested parts
    if (part.parts && checkForAttachments(part.parts)) {
      return true;
    }
  }

  return false;
}

function extractBody(msg: GmailMessage): { body: string; isHtml: boolean } {
  const payload = msg.payload;

  if (!payload) {
    return { body: "", isHtml: false };
  }

  // Simple single-part message
  if (payload.body?.data) {
    const isHtml = payload.mimeType === "text/html";
    return {
      body: decodeBase64Url(payload.body.data),
      isHtml,
    };
  }

  // Multipart message - find the best body
  if (payload.parts) {
    // Prefer HTML, fallback to plain text
    const htmlPart = findPart(payload.parts, "text/html");
    if (htmlPart?.body?.data) {
      return {
        body: decodeBase64Url(htmlPart.body.data),
        isHtml: true,
      };
    }

    const textPart = findPart(payload.parts, "text/plain");
    if (textPart?.body?.data) {
      return {
        body: decodeBase64Url(textPart.body.data),
        isHtml: false,
      };
    }
  }

  return { body: msg.snippet || "", isHtml: false };
}

function findPart(
  parts: GmailMessagePart[],
  mimeType: string
): GmailMessagePart | null {
  for (const part of parts) {
    if (part.mimeType === mimeType) {
      return part;
    }

    // Check nested parts (for multipart/alternative, etc.)
    if (part.parts) {
      const found = findPart(part.parts, mimeType);
      if (found) return found;
    }
  }

  return null;
}

function decodeBase64Url(data: string): string {
  // Replace URL-safe characters
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");

  // Decode
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    // Fallback for non-UTF8 content
    return atob(base64);
  }
}
