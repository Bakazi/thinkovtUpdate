import { db } from '@/lib/db';

const DEFAULT_BLUEPRINT_SYSTEM_PROMPT = `You are Thinkovr — Think Over Everything. Generate a comprehensive, actionable blueprint based on the user's idea.
The blueprint should include: 1) Executive Summary, 2) Key Constraints Analysis, 3) Step-by-step Execution Plan,
4) Risk Assessment, 5) KPIs and Milestones, 6) Resource Requirements, 7) Timeline.
Be direct, precise, and actionable. No fluff. This is a directive, not advice.`;

const DEFAULT_ENGINE_SKILLS = `- Apply the Five Filters: Capital, Time, Skill leverage, Geo-economic fit, Fear-failure alignment.
- Be specific: name the first 3 actions the user must do within 72 hours.
- Force constraints: if inputs are vague, make explicit assumptions and label them.`;

const DEFAULT_AUDIT_SYSTEM_PROMPT = `You are Thinkovr — Think Over Everything — a ruthless, precise strategic auditor.
A user has submitted their business/career plan for a free audit.
Your job: identify the SINGLE BIGGEST FLAW in their logic that could cause failure.
Be direct, specific, and constructive. No fluff. No validation. Just the truth.
Format your response as:
1. THE VERDICT: [One sentence summary of the fatal flaw]
2. THE EVIDENCE: [2-3 sentences explaining WHY this will fail, with specific logic]
3. THE FIX: [1-2 actionable steps to address this flaw]
Keep it under 200 words. Be brutal but useful.`;

export async function generateBlueprint(idea: string, title: string): Promise<string> {
  const configs = await db.aIConfig.findMany();
  const configMap: Record<string, string> = {};
  for (const c of configs) {
    configMap[c.key] = c.value;
  }

  const blueprintSystemPrompt =
    configMap['BLUEPRINT_SYSTEM_PROMPT'] || DEFAULT_BLUEPRINT_SYSTEM_PROMPT;
  const engineSkills = configMap['ENGINE_SKILLS'] || DEFAULT_ENGINE_SKILLS;
  const systemPrompt = `${blueprintSystemPrompt}\n\n[ENGINE SKILLS]\n${engineSkills}`;

  const aiProvider = (configMap['AI_PROVIDER'] || 'AUTO').toUpperCase();

  const geminiKeys = splitKeys(
    configMap['GEMINI_API_KEYS'] || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || ''
  );
  const geminiModel = configMap['GEMINI_MODEL'] || 'gemini-1.5-flash';

  const groqKeys = splitKeys(configMap['GROQ_API_KEYS'] || process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '');
  const groqModel = configMap['GROQ_MODEL'] || 'llama-3.3-70b-versatile';

  const ollamaUrl = configMap['OLLAMA_BASE_URL'] || '';
  const ollamaModel = configMap['OLLAMA_MODEL'] || 'llama3';

  const userPrompt = `Generate a comprehensive blueprint for the following idea:\n\nTitle: ${title}\n\nIdea/Description: ${idea}\n\nProvide a complete, actionable blueprint following the Thinkovr format.`;

  const orderedProviders =
    aiProvider === 'AUTO'
      ? (['GEMINI', 'GROQ', 'OLLAMA', 'BUILTIN'] as const)
      : ([aiProvider] as const);

  for (const provider of orderedProviders) {
    // Gemini
    if (provider === 'GEMINI') {
      for (const key of geminiKeys) {
        try {
          return await generateWithGemini(key, geminiModel, systemPrompt, userPrompt);
        } catch (err) {
          console.error('Gemini failed:', err);
        }
      }
    }

    // Groq
    if (provider === 'GROQ') {
      for (const key of groqKeys) {
        try {
          return await generateWithGroq(key, systemPrompt, userPrompt, groqModel);
        } catch (err) {
          console.error('Groq failed:', err);
        }
      }
    }

    // Ollama
    if (provider === 'OLLAMA' && ollamaUrl) {
      try {
        return await generateWithOllama(ollamaUrl, systemPrompt, userPrompt, ollamaModel);
      } catch (err) {
        console.error('Ollama failed:', err);
      }
    }

    // Built-in (requires .z-ai-config file; typically not available on Vercel)
    if (provider === 'BUILTIN') {
      try {
        return await generateWithBuiltin(systemPrompt, userPrompt);
      } catch (err) {
        console.error('Built-in failed:', err);
      }
    }
  }

  throw new Error('All AI providers failed. Configure Gemini/Groq/Ollama in Admin → AI Configuration.');
}

function splitKeys(raw: string): string[] {
  return String(raw)
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function generateWithGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  // Google AI Studio (Gemini) REST API
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('');
  if (!text) throw new Error('Gemini returned no content');
  return text;
}

// Legacy: keep for backwards compat if someone still uses these keys
// Priority 1: Built-in free AI (z-ai-web-dev-sdk) — no key needed
export async function generateBlueprintLegacy(idea: string, title: string): Promise<string> {
  const configs = await db.aIConfig.findMany();
  const configMap: Record<string, string> = {};
  for (const c of configs) configMap[c.key] = c.value;

  const aiProvider = configMap['AI_PROVIDER'] || 'BUILTIN';
  const groqKey = configMap['GROQ_API_KEY'] || process.env.GROQ_API_KEY || '';
  const ollamaUrl = configMap['OLLAMA_BASE_URL'];
  const modelName = configMap['MODEL_NAME'] || '';

  const userPrompt = `Generate a comprehensive blueprint for the following idea:\n\nTitle: ${title}\n\nIdea/Description: ${idea}\n\nProvide a complete, actionable blueprint following the Thinkovr format.`;

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

async function generateWithBuiltin(systemPrompt: string, userPrompt: string): Promise<string> {
  const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);
  const zai = await ZAI.create();

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
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

async function generateWithGroq(apiKey: string, systemPrompt: string, userPrompt: string, modelName: string): Promise<string> {
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
        { role: 'system', content: systemPrompt },
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

async function generateWithOllama(baseUrl: string, systemPrompt: string, userPrompt: string, modelName: string): Promise<string> {
  const model = modelName || 'llama3';
  const url = baseUrl.replace(/\/$/, '');

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

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

  const aiProvider = (configMap['AI_PROVIDER'] || 'AUTO').toUpperCase();

  const geminiKeys = splitKeys(
    configMap['GEMINI_API_KEYS'] || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || ''
  );
  const geminiModel = configMap['GEMINI_MODEL'] || 'gemini-1.5-flash';

  const groqKeys = splitKeys(configMap['GROQ_API_KEYS'] || process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '');
  const groqModel = configMap['GROQ_MODEL'] || 'llama-3.3-70b-versatile';
  const ollamaUrl = configMap['OLLAMA_BASE_URL'] || '';

  const orderedProviders =
    aiProvider === 'AUTO'
      ? (['GEMINI', 'GROQ', 'OLLAMA', 'BUILTIN'] as const)
      : ([aiProvider] as const);

  for (const provider of orderedProviders) {
    if (provider === 'GEMINI') {
      for (const key of geminiKeys) {
        try {
          await generateWithGemini(key, geminiModel, 'Say "Engine online." in 2 words.');
          return { success: true, message: `Gemini (${geminiModel}) is connected.` };
        } catch (err) {
          console.error('Gemini test failed:', err);
        }
      }
    }

    if (provider === 'GROQ') {
      for (const key of groqKeys) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [{ role: 'user', content: 'Say "Engine online." in 3 words.' }],
              temperature: 0,
              max_tokens: 20,
            }),
          });

          if (response.ok) {
            return { success: true, message: `Groq (${groqModel}) is connected.` };
          }
        } catch (err) {
          console.error('Groq test failed:', err);
        }
      }
    }

    if (provider === 'OLLAMA' && ollamaUrl) {
      try {
        const url = ollamaUrl.replace(/\/$/, '');
        const response = await fetch(`${url}/api/tags`);
        if (response.ok) {
          return { success: true, message: `Ollama is reachable at ${ollamaUrl}.` };
        }
      } catch (err) {
        console.error('Ollama test failed:', err);
      }
    }

    if (provider === 'BUILTIN') {
      try {
        const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);
        const zai = await ZAI.create();
        await zai.chat.completions.create({
          messages: [{ role: 'user', content: 'Say "Engine online." in 2 words.' }],
          temperature: 0,
          max_tokens: 20,
        });
        return { success: true, message: 'Built-in AI — connected.' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        if (String(msg).toLowerCase().includes('configuration file not found')) {
          return {
            success: false,
            message:
              'Built-in is not configured on Vercel. Use AUTO (Gemini→Groq→Ollama) or set up a Groq/Gemini key.',
          };
        }
      }
    }
  }

  return { success: false, message: 'No AI provider configured. Add Gemini/Groq keys or an Ollama URL.' };
}

export async function generateAuditResponse(email: string, plan: string): Promise<string> {
  const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);
  const zai = await ZAI.create();

  const configs = await db.aIConfig.findMany();
  const configMap: Record<string, string> = {};
  for (const c of configs) configMap[c.key] = c.value;
  const auditSystemPrompt = configMap['AUDIT_SYSTEM_PROMPT'] || DEFAULT_AUDIT_SYSTEM_PROMPT;

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: auditSystemPrompt,
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
