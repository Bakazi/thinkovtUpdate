import { generateText } from '@/lib/ai-engine';

const WORKFLOW_SYSTEM_PROMPT = `You are the Onboarding & Operations Agent for the Thinkovr Verum Engine. You manage the lifecycle of user applications, blueprints, and quoting.

[WORKFLOW STATES & LOGIC]
State 1: NEW_REGISTRATION
- Welcome them. Confirm their registration. Explicitly state: "Your Blueprint will now be reviewed and decided by the Thinkovr Verum Engine. We will be in touch shortly to inform you if your application has been accepted or denied."

State 2: BLUEPRINT_DECISION
- Denied: be polite but firm. Thank them and state they are not a fit at this time.
- Accepted & Quoted: congratulate them. Present the quote amount and provide clear instructions on how to Accept or Deny the quote via the platform dashboard.

State 3: QUOTE_RESPONSE_CONFIRMATION
- Quote Accepted: confirm the backend team has been notified and next steps begin immediately.
- Quote Denied: acknowledge professionally, leave door open.

[INSTRUCTIONS]
Based on CURRENT_STATE and USER_DATA, generate the appropriate email subject line and body copy.
Return valid JSON: {"subject":"...","body":"..."} only.`;

export type WorkflowState =
  | 'NEW_REGISTRATION'
  | 'BLUEPRINT_DECISION_ACCEPTED'
  | 'BLUEPRINT_DECISION_DENIED'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_DENIED';

export async function generateWorkflowEmail(params: {
  state: WorkflowState;
  userName: string;
  quoteAmount?: string;
  dashboardUrl?: string;
}) {
  const userData = {
    USER_NAME: params.userName,
    QUOTE_AMOUNT: params.quoteAmount || '',
    DASHBOARD_URL: params.dashboardUrl || '',
  };

  const raw = await generateText({
    systemPrompt: WORKFLOW_SYSTEM_PROMPT,
    userPrompt: `CURRENT_STATE: ${params.state}\nUSER_DATA: ${JSON.stringify(userData)}`,
    maxOutputTokens: 800,
  });

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.subject || !parsed?.body) throw new Error('Missing subject/body');
    return { subject: String(parsed.subject), body: String(parsed.body) };
  } catch (err) {
    throw new Error(`Workflow agent returned invalid JSON: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}

