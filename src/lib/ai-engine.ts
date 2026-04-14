import { db } from '@/lib/db';

const BLUEPRINT_SYSTEM_PROMPT = `You are Thinkovr — Think Over Everything. Generate a comprehensive, actionable blueprint based on the user's idea. 
The blueprint should include: 1) Executive Summary, 2) Key Constraints Analysis, 3) Step-by-step Execution Plan, 
4) Risk Assessment, 5) KPIs and Milestones, 6) Resource Requirements, 7) Timeline.
Be direct, precise, and actionable. No fluff. This is a directive, not advice.`;

export async function generateBlueprint(idea: string, title: string): Promise<string> {
  const configs = await db.aIConfig.findMany();
  const configMap: Record<string, string> = {};
  for (const c of configs) {
    configMap[c.key] = c.value;
  }

  const aiProvider = configMap['AI_PROVIDER'] || 'BUILTIN';
  const groqKey = configMap['GROQ_API_KEY'] || process.env.GROQ_API_KEY || '';
  const ollamaUrl = configMap['OLLAMA_BASE_URL'];
  const modelName = configMap['MODEL_NAME'] || '';

  const userPrompt = `Generate a comprehensive blueprint for the following idea:\n\nTitle: ${title}\n\nIdea/Description: ${idea}\n\nProvide a complete, actionable blueprint following the Thinkovr format.`;

  // Priority 1: Built-in free AI (z-ai-web-dev-sdk) — no key needed
  if (aiProvider === 'BUILTIN' || (!groqKey && !ollamaUrl)) {
    try {
      return await generateWithBuiltin(userPrompt);
    } catch (err) {
      console.error('Built-in AI failed, trying fallbacks:', err);
    }
  }

  // Priority 2: Groq (if key available)
  if (groqKey) {
    try {
      return await generateWithGroq(groqKey, userPrompt, modelName);
    } catch (err) {
      console.error('Groq AI failed:', err);
    }
  }

  // Priority 3: Ollama (if URL available)
  if (ollamaUrl) {
    return generateWithOllama(ollamaUrl, userPrompt, modelName);
  }

  throw new Error('All AI providers failed. Please contact support.');
}

async function generateWithBuiltin(userPrompt: string): Promise<string> {
  const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);
  const zai = await ZAI.create();

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: BLUEPRINT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Built-in AI returned no content');
  }
  return content;
}

async function generateWithGroq(apiKey: string, userPrompt: string, modelName: string): Promise<string> {
  const model = modelName || 'llama-3.3-70b-versatile';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: BLUEPRINT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No content generated.';
}

async function generateWithOllama(baseUrl: string, userPrompt: string, modelName: string): Promise<string> {
  const model = modelName || 'llama3';
  const url = baseUrl.replace(/\/$/, '');

  const fullPrompt = `${BLUEPRINT_SYSTEM_PROMPT}\n\n${userPrompt}`;

  const response = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.response || 'No content generated.';
}

export async function testAIConnection(): Promise<{ success: boolean; message: string }> {
  const configs = await db.aIConfig.findMany();
  const configMap: Record<string, string> = {};
  for (const c of configs) {
    configMap[c.key] = c.value;
  }

  const aiProvider = configMap['AI_PROVIDER'] || 'BUILTIN';

  // Test built-in AI first
  if (aiProvider === 'BUILTIN') {
    try {
      const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);
      const zai = await ZAI.create();
      await zai.chat.completions.create({
        messages: [{ role: 'user', content: 'Say "Engine online." in 2 words.' }],
        temperature: 0,
        max_tokens: 20,
      });
      return { success: true, message: 'Built-in AI (free) — connected and ready.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      if (msg.toLowerCase().includes('configuration file not found')) {
        return {
          success: false,
          message:
            'BUILTIN is not configured on Vercel. Switch AI_PROVIDER to GROQ and set GROQ_API_KEY, or use OLLAMA locally.',
        };
      }
      return { success: false, message: `Built-in AI error: ${msg}` };
    }
  }

  // Test Groq
  const groqKey = configMap['GROQ_API_KEY'] || process.env.GROQ_API_KEY || '';
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: configMap['MODEL_NAME'] || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Say "Engine online." in 3 words.' }],
          temperature: 0,
          max_tokens: 20,
        }),
      });

      if (response.ok) {
        return { success: true, message: 'Groq API connection successful.' };
      }
      return { success: false, message: `Groq API returned ${response.status}. Check your API key.` };
    } catch {
      return { success: false, message: 'Could not reach Groq API.' };
    }
  }

  // Test Ollama
  const ollamaUrl = configMap['OLLAMA_BASE_URL'];
  if (ollamaUrl) {
    try {
      const url = ollamaUrl.replace(/\/$/, '');
      const response = await fetch(`${url}/api/tags`);
      if (response.ok) {
        return { success: true, message: `Ollama is reachable at ${ollamaUrl}.` };
      }
      return { success: false, message: `Ollama returned ${response.status}.` };
    } catch {
      return { success: false, message: `Could not reach Ollama at ${ollamaUrl}.` };
    }
  }

  return { success: false, message: 'No AI provider configured.' };
}

export async function generateAuditResponse(email: string, plan: string): Promise<string> {
  const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);
  const zai = await ZAI.create();

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are Thinkovr — Think Over Everything — a ruthless, precise strategic auditor.
A user has submitted their business/career plan for a free audit.
Your job: identify the SINGLE BIGGEST FLAW in their logic that could cause failure.
Be direct, specific, and constructive. No fluff. No validation. Just the truth.
Format your response as:
1. THE VERDICT: [One sentence summary of the fatal flaw]
2. THE EVIDENCE: [2-3 sentences explaining WHY this will fail, with specific logic]
3. THE FIX: [1-2 actionable steps to address this flaw]
Keep it under 200 words. Be brutal but useful.`,
      },
      {
        role: 'user',
        content: `Email: ${email}\n\nTheir Plan:\n${plan}\n\nIdentify the single biggest flaw.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  return completion.choices?.[0]?.message?.content || 'Audit processing failed.';
}
