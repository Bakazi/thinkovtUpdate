/**
 * Agent Registry - Central registry for all AI agents in the Thinkovr system.
 *
 * This module provides a unified interface for:
 * - Registering and discovering available agents
 * - Running agent prompts through the free built-in AI (z-ai-web-dev-sdk)
 * - Managing custom prompt overrides from the database
 *
 * Admin/Staff can inject custom prompts or eject them back to defaults
 * through the API routes at /api/agents.
 */

export { runEmailAgent, getDefaultEmailAgentPrompt, getEmailAgentToolDefinitions } from './email-operations-copilot';
export type { EmailAgentResponse, EmailToolCall } from './email-operations-copilot';

export { runSupportAgent, getDefaultSupportAgentPrompt, getSupportCategories } from './support-auto-responder';
export type { SupportAgentResponse, EscalationLevel } from './support-auto-responder';

/**
 * Registry of all built-in agents.
 * Each agent has a name, description, and default prompt getter.
 */
export const AGENT_REGISTRY = [
  {
    name: 'email-operations-copilot',
    displayName: 'Email Operations Co-Pilot',
    description: 'Handles email workflows: drafting outreach, reviewing inbox, and auto-replying to messages.',
    category: 'email',
    defaultPromptGetter: 'getDefaultEmailAgentPrompt',
    runFunction: 'runEmailAgent',
  },
  {
    name: 'support-auto-responder',
    displayName: 'Support Auto-Responder',
    description: 'Resolves common support tickets automatically. Escalates complex issues to human agents.',
    category: 'support',
    defaultPromptGetter: 'getDefaultSupportAgentPrompt',
    runFunction: 'runSupportAgent',
  },
] as const;

export type AgentRegistryEntry = (typeof AGENT_REGISTRY)[number];

/**
 * Get all registered agent names.
 */
export function getAgentNames(): string[] {
  return AGENT_REGISTRY.map((a) => a.name);
}

/**
 * Get a registered agent by name.
 */
export function getAgentByName(name: string): AgentRegistryEntry | undefined {
  return AGENT_REGISTRY.find((a) => a.name === name);
}
