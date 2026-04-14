/**
 * Support Auto-Responder Agent
 *
 * Converts the original Claude-based Intercom support agent to use
 * the free built-in z-ai-web-dev-sdk for offline AI processing.
 *
 * Original agent: Used claude-sonnet-4-6 with Intercom MCP server integration
 * Converted agent: Uses z-ai-web-dev-sdk (free, no API key needed)
 *
 * This agent handles:
 * 1) Resolving common support tickets automatically (password resets, billing, feature how-tos, order status)
 * 2) Escalating complex issues to human agents with full context
 * 3) Maintaining empathetic, professional, and concise responses
 */

import { db } from '@/lib/db';

// ── System Prompt (extracted from original YAML, adapted for general use) ──
const DEFAULT_SYSTEM_PROMPT = `You are a support auto-responder integrated with a customer support system.
When a new conversation arrives, read the customer's message, identify the issue, and attempt to resolve it
using your knowledge base and available tools.

For common issues (password resets, billing questions, feature how-tos, order status, account settings),
provide a clear, helpful response and suggest resolving the conversation.

For complex, sensitive, or ambiguous issues (bugs, refund disputes, account suspensions, security concerns,
anything requiring human judgment), escalate to a human agent by summarizing:
1. THE ISSUE: A clear one-sentence summary of the customer's problem
2. SENTIMENT: Customer's emotional state (frustrated, confused, urgent, calm, etc.)
3. STEPS TAKEN: Any troubleshooting steps already attempted
4. RECOMMENDED ACTION: What the human agent should do next

Always be concise, empathetic, and professional. Never guess at account-specific details you don't have access to.
If you're unsure about something, ask for clarification rather than giving incorrect information.`;

// ── Escalation Categories ──
export type EscalationLevel = 'auto_resolved' | 'needs_human' | 'urgent';

export interface SupportAgentResponse {
  escalationLevel: EscalationLevel;
  reply: string;
  summary?: string;
  sentiment?: string;
  suggestedAction?: string;
}

/**
 * Process a support ticket using the free built-in AI.
 */
export async function runSupportAgent(
  customerMessage: string,
  ticketContext?: {
    ticketId?: string;
    customerEmail?: string;
    previousMessages?: Array<{ role: string; content: string }>;
    category?: string;
  },
  customSystemPrompt?: string
): Promise<SupportAgentResponse> {
  // Check for custom prompt overrides from the AgentPrompt table
  let systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;

  try {
    const activePrompt = await db.agentPrompt.findFirst({
      where: {
        agentName: 'support-auto-responder',
        isActive: true,
      },
    });

    if (activePrompt) {
      systemPrompt = activePrompt.systemPrompt;
    }
  } catch {
    // If DB is unavailable, fall back to default prompt
    console.warn('Could not load custom prompt for support agent, using default.');
  }

  // Build the full user message with context
  let fullUserMessage = '';
  if (ticketContext) {
    const parts: string[] = [];
    if (ticketContext.ticketId) parts.push(`Ticket ID: ${ticketContext.ticketId}`);
    if (ticketContext.customerEmail) parts.push(`Customer Email: ${ticketContext.customerEmail}`);
    if (ticketContext.category) parts.push(`Category: ${ticketContext.category}`);

    if (parts.length > 0) {
      fullUserMessage += `[Ticket Context]\n${parts.join('\n')}\n\n`;
    }

    if (ticketContext.previousMessages && ticketContext.previousMessages.length > 0) {
      fullUserMessage += '[Previous Messages]\n';
      ticketContext.previousMessages.forEach((msg) => {
        fullUserMessage += `${msg.role}: ${msg.content}\n`;
      });
      fullUserMessage += '\n';
    }
  }

  fullUserMessage += `[New Customer Message]\n${customerMessage}`;
  fullUserMessage += '\n\n[Instructions]\nAnalyze the customer message and provide your response. If this can be auto-resolved, write the response directly. If it needs escalation, use the format:\nESCALATION NEEDED\nISSUE: ...\nSENTIMENT: ...\nSTEPS TAKEN: ...\nRECOMMENDED ACTION: ...';

  // Build message history
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: fullUserMessage },
  ];

  try {
    const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: 0.5,
      max_tokens: 1500,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI returned no content');
    }

    return parseSupportAgentResponse(content);
  } catch (error) {
    console.error('Support agent AI error:', error);
    return {
      escalationLevel: 'needs_human',
      reply: 'I apologize, but I encountered an error processing your request. A human agent will review your ticket shortly.',
      summary: `AI processing error: ${error instanceof Error ? error.message : 'Unknown'}`,
      sentiment: 'unknown',
      suggestedAction: 'Manual review required due to AI processing failure',
    };
  }
}

/**
 * Parse the AI response to determine escalation level and extract structured data.
 */
function parseSupportAgentResponse(content: string): SupportAgentResponse {
  const lines = content.trim().split('\n');
  const upperContent = content.toUpperCase();

  // Check if escalation is needed
  if (upperContent.includes('ESCALATION NEEDED') || upperContent.includes('ESCALATE TO HUMAN')) {
    const summary = extractField(content, 'ISSUE');
    const sentiment = extractField(content, 'SENTIMENT');
    const stepsTaken = extractField(content, 'STEPS TAKEN');
    const suggestedAction = extractField(content, 'RECOMMENDED ACTION');

    // Clean the reply to remove structured escalation fields
    const replyLines = lines.filter((line) => {
      const upper = line.toUpperCase().trim();
      return (
        !upper.startsWith('ESCALATION') &&
        !upper.startsWith('ISSUE:') &&
        !upper.startsWith('SENTIMENT:') &&
        !upper.startsWith('STEPS TAKEN:') &&
        !upper.startsWith('RECOMMENDED ACTION:') &&
        upper !== '[INSTRUCTIONS]'
      );
    });

    return {
      escalationLevel: sentiment?.toLowerCase().includes('urgent') ? 'urgent' : 'needs_human',
      reply: replyLines.join('\n').trim() || 'This issue requires human review.',
      summary: summary || undefined,
      sentiment: sentiment || undefined,
      suggestedAction: suggestedAction || stepsTaken || undefined,
    };
  }

  return {
    escalationLevel: 'auto_resolved',
    reply: content.trim(),
  };
}

/**
 * Extract a field value from the AI response text.
 */
function extractField(content: string, fieldName: string): string | undefined {
  const regex = new RegExp(`${fieldName}:\\s*(.+?)(?:\\n|$)`, 'i');
  const match = content.match(regex);
  return match?.[1]?.trim() || undefined;
}

/**
 * Export the default system prompt for admin reference.
 */
export function getDefaultSupportAgentPrompt(): string {
  return DEFAULT_SYSTEM_PROMPT;
}

/**
 * Get common issue categories for admin reference.
 */
export function getSupportCategories(): string[] {
  return [
    'password_reset',
    'billing',
    'feature_howto',
    'order_status',
    'account_settings',
    'bug_report',
    'refund_request',
    'account_suspension',
    'security_concern',
    'general_inquiry',
  ];
}
