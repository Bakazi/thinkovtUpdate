import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { AGENT_REGISTRY } from '@/lib/agents';
import { getDefaultEmailAgentPrompt } from '@/lib/agents/email-operations-copilot';
import { getDefaultSupportAgentPrompt } from '@/lib/agents/support-auto-responder';

/**
 * GET /api/agents
 * List all registered agents with their current prompt configuration.
 * Admin and Staff access only.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Forbidden — Admin or Staff only' }, { status: 403 });
    }

    // Get all custom prompts from the database
    const customPrompts = await db.agentPrompt.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    // Build the agent list with current prompt info
    const agents = AGENT_REGISTRY.map((agent) => {
      const customPrompt = customPrompts.find(
        (cp) => cp.agentName === agent.name && cp.isActive
      );

      // Get the default prompt for reference
      let defaultPrompt = '';
      if (agent.name === 'email-operations-copilot') {
        defaultPrompt = getDefaultEmailAgentPrompt();
      } else if (agent.name === 'support-auto-responder') {
        defaultPrompt = getDefaultSupportAgentPrompt();
      }

      return {
        name: agent.name,
        displayName: agent.displayName,
        description: agent.description,
        category: agent.category,
        currentPrompt: customPrompt?.systemPrompt || defaultPrompt,
        isCustomPrompt: !!customPrompt,
        isActive: customPrompt ? customPrompt.isActive : true,
        promptId: customPrompt?.id || null,
        customPromptCount: customPrompts.filter((cp) => cp.agentName === agent.name).length,
        lastUpdated: customPrompt?.updatedAt || null,
      };
    });

    // Also return all prompt history for each agent
    const promptHistory = customPrompts.map((cp) => ({
      id: cp.id,
      agentName: cp.agentName,
      description: cp.description,
      systemPrompt: cp.systemPrompt,
      isActive: cp.isActive,
      createdBy: cp.createdBy,
      createdAt: cp.createdAt,
      updatedAt: cp.updatedAt,
    }));

    return NextResponse.json({ agents, promptHistory });
  } catch (error: unknown) {
    console.error('Fetch agents error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

/**
 * POST /api/agents
 * Inject (add) a custom prompt for an agent, or run an agent.
 * 
 * Body options:
 * 1. Inject prompt: { action: "inject", agentName, systemPrompt, description? }
 * 2. Run agent: { action: "run", agentName, message, context? }
 * 3. Toggle agent: { action: "toggle", agentName, isActive }
 * 4. Eject prompt: { action: "eject", agentName } - revert to default prompt
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Forbidden — Admin or Staff only' }, { status: 403 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { action } = body;

    // ── INJECT: Add or update a custom prompt ──
    if (action === 'inject') {
      const { agentName, systemPrompt, description } = body;

      if (!agentName || !systemPrompt) {
        return NextResponse.json(
          { error: 'agentName and systemPrompt are required' },
          { status: 400 }
        );
      }

      // Verify the agent exists in the registry
      const registeredAgent = AGENT_REGISTRY.find((a) => a.name === agentName);
      if (!registeredAgent) {
        return NextResponse.json(
          { error: `Unknown agent: ${agentName}. Registered agents: ${AGENT_REGISTRY.map((a) => a.name).join(', ')}` },
          { status: 400 }
        );
      }

      // Deactivate any existing active prompt for this agent
      await db.agentPrompt.updateMany({
        where: { agentName, isActive: true },
        data: { isActive: false },
      });

      // Create the new active prompt
      const prompt = await db.agentPrompt.create({
        data: {
          agentName,
          description: description || `Custom prompt for ${registeredAgent.displayName}`,
          systemPrompt,
          isActive: true,
          createdBy: userId,
        },
      });

      return NextResponse.json({
        message: `Custom prompt injected for ${registeredAgent.displayName}`,
        prompt,
      }, { status: 201 });
    }

    // ── EJECT: Revert to default prompt ──
    if (action === 'eject') {
      const { agentName } = body;

      if (!agentName) {
        return NextResponse.json({ error: 'agentName is required' }, { status: 400 });
      }

      const registeredAgent = AGENT_REGISTRY.find((a) => a.name === agentName);
      if (!registeredAgent) {
        return NextResponse.json({ error: `Unknown agent: ${agentName}` }, { status: 400 });
      }

      // Deactivate all custom prompts for this agent
      const result = await db.agentPrompt.updateMany({
        where: { agentName },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: `Custom prompt ejected for ${registeredAgent.displayName}. Reverted to default prompt.`,
        deactivatedCount: result.count,
      });
    }

    // ── TOGGLE: Enable/disable an agent ──
    if (action === 'toggle') {
      const { agentName, isActive } = body;

      if (!agentName || typeof isActive !== 'boolean') {
        return NextResponse.json(
          { error: 'agentName and isActive (boolean) are required' },
          { status: 400 }
        );
      }

      const result = await db.agentPrompt.updateMany({
        where: { agentName },
        data: { isActive },
      });

      return NextResponse.json({
        message: `Agent ${agentName} ${isActive ? 'activated' : 'deactivated'}`,
        updatedCount: result.count,
      });
    }

    // ── RUN: Execute an agent ──
    if (action === 'run') {
      const { agentName, message, context } = body;

      if (!agentName || !message) {
        return NextResponse.json(
          { error: 'agentName and message are required' },
          { status: 400 }
        );
      }

      // Dynamic import based on agent
      if (agentName === 'email-operations-copilot') {
        const { runEmailAgent } = await import('@/lib/agents/email-operations-copilot');
        const result = await runEmailAgent(message, context?.previousMessages);
        return NextResponse.json({ result });
      }

      if (agentName === 'support-auto-responder') {
        const { runSupportAgent } = await import('@/lib/agents/support-auto-responder');
        const result = await runSupportAgent(message, context);
        return NextResponse.json({ result });
      }

      return NextResponse.json({ error: `Unknown agent: ${agentName}` }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid action. Use: inject, eject, toggle, or run.' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Agent action error:', error);
    return NextResponse.json({ error: 'Agent action failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/agents
 * Delete a specific prompt by ID.
 * Body: { promptId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { promptId } = body;

    if (!promptId) {
      return NextResponse.json({ error: 'promptId is required' }, { status: 400 });
    }

    await db.agentPrompt.delete({
      where: { id: promptId },
    });

    return NextResponse.json({ message: 'Prompt deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete prompt error:', error);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }
}
