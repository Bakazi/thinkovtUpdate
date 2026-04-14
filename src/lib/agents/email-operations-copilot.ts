/**
 * Email Operations Co-Pilot Agent
 *
 * Converts the original Anthropic Claude-based email agent to use
 * the free built-in z-ai-web-dev-sdk for offline AI processing.
 *
 * Original agent: Used @anthropic-ai/sdk with claude-sonnet-4-6 model
 * Converted agent: Uses z-ai-web-dev-sdk (free, no API key needed)
 *
 * This agent handles:
 * 1) Drafting and sending intro/outreach emails
 * 2) Reading inbox and reviewing responses
 * 3) Auto-replying to inbound messages
 */

import { db } from '@/lib/db';
import { generateText } from '@/lib/ai-engine';

// ── System Prompt (from Thinkovr-Verum-Engine-MDandPrompt/Core-Email-Agent/Core Email Agent P MD.md) ──
const DEFAULT_SYSTEM_PROMPT = `You are the Primary Communications Agent. You are a highly articulate, friendly, and profoundly professional email assistant.

[OBJECTIVE]
Draft, refine, or respond to emails on behalf of the system or staff. Your goal is to ensure all communication is crystal clear, empathetic, and aligns with the highest standards of professional etiquette.

[TONE]
Warm, confident, concise, and helpful. Avoid robotic phrasing; sound genuinely human.

[INSTRUCTIONS]
1. Analyze: Review the provided context, sender intent, and key information required in the email.
2. Structure:
   - Open with a warm, polite greeting.
   - State the purpose of the email directly in the first paragraph.
   - Provide necessary details or action items clearly (use bullet points if there are 3+ items).
   - Close with a professional, forward-looking sign-off.
3. Refine: Ensure the language is free of jargon unless communicating with technical peers. Do not hallucinate links, dates, or company policies—stick strictly to the provided context.`;

// ── Tool Definitions ──
export interface EmailToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface EmailAgentResponse {
  action: 'send_email' | 'read_inbox' | 'auto_reply' | 'info';
  content: string;
  toolCalls?: EmailToolCall[];
}

/**
 * Generate an email operation response using the free built-in AI.
 */
export async function runEmailAgent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  customSystemPrompt?: string
): Promise<EmailAgentResponse> {
  // Check for custom prompt overrides from the AgentPrompt table
  let systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;

  try {
    const activePrompt = await db.agentPrompt.findFirst({
      where: {
        agentName: 'email-operations-copilot',
        isActive: true,
      },
    });

    if (activePrompt) {
      systemPrompt = activePrompt.systemPrompt;
    }
  } catch {
    // If DB is unavailable, fall back to default prompt
    console.warn('Could not load custom prompt for email agent, using default.');
  }

  // Build message history
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    const content = await generateText({
      systemPrompt,
      userPrompt: messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n'),
      maxOutputTokens: 2048,
    });
    return parseEmailAgentResponse(content);
  } catch (error) {
    console.error('Email agent AI error:', error);
    return {
      action: 'info',
      content: `Email agent encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
    };
  }
}

/**
 * Parse the AI response to determine the intended email action.
 */
function parseEmailAgentResponse(content: string): EmailAgentResponse {
  const lower = content.toLowerCase();

  if (lower.includes('send_intro_email') || lower.includes('sending email') || lower.includes('outreach')) {
    return {
      action: 'send_email',
      content,
    };
  }

  if (lower.includes('read_inbox') || lower.includes('inbox') || lower.includes('review')) {
    return {
      action: 'read_inbox',
      content,
    };
  }

  if (lower.includes('auto_reply') || lower.includes('reply') || lower.includes('responding')) {
    return {
      action: 'auto_reply',
      content,
    };
  }

  return {
    action: 'info',
    content,
  };
}

/**
 * Export the default system prompt for admin reference.
 */
export function getDefaultEmailAgentPrompt(): string {
  return DEFAULT_SYSTEM_PROMPT;
}

/**
 * Export tool definitions for admin reference.
 */
export function getEmailAgentToolDefinitions(): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> {
  return [
    {
      name: 'send_intro_email',
      description: 'Send an intro/outreach email. Provide recipient email, subject, and body text.',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject (3-200 chars)' },
          text: { type: 'string', description: 'Plain text body (min 10 chars)' },
          html: { type: 'string', description: 'Optional HTML body' },
        },
        required: ['to', 'subject', 'text'],
      },
    },
    {
      name: 'read_inbox',
      description: 'Read recent messages from the configured inbox.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max messages to return (1-50, default 10)' },
        },
      },
    },
    {
      name: 'auto_reply',
      description: 'Auto-reply to a specific or latest inbound message.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Reply text (min 3 chars)' },
          html: { type: 'string', description: 'Optional HTML reply' },
          messageId: { type: 'string', description: 'Message ID to reply to (latest if omitted)' },
          replyAll: { type: 'boolean', description: 'Reply to all recipients' },
        },
        required: ['text'],
      },
    },
  ];
}
