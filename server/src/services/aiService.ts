/**
 * Internal AI service — uses Anthropic Claude API
 * All AI output is a DRAFT. The human (secretary / CEO) always makes the final decision.
 */

const callClaude = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) throw new Error(`AI service error: ${response.status}`);
  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((b) => b.type === 'text')?.text ?? '';
};

export const draftBudgetAlert = async (p: {
  memberName: string; month: string; allowance: number;
  spent: number; categories: Record<string, number>; lang: 'en' | 'es';
}): Promise<{ subject: string; body: string }> => {
  const sys = `You are a compassionate communications assistant for GreenRoots ONG.
Help the finances secretary draft warm, non-judgmental budget messages.
Respond ONLY with valid JSON: {"subject":"...","body":"..."}`;
  const usr = `Draft a budget alert in ${p.lang === 'es' ? 'Spanish' : 'English'}.
Member: ${p.memberName}, Month: ${p.month}
Allowance: $${p.allowance}, Spent: $${p.spent}, Over by: $${p.spent - p.allowance}
Categories: ${JSON.stringify(p.categories)}
Include placeholder [TRAINING_LINK] for a budgeting guide.`;
  return JSON.parse((await callClaude(sys, usr)).replace(/```json|```/g, '').trim());
};

export const draftHealthEmergencyMessage = async (p: {
  memberName: string; situation: string; amountReleased: number; lang: 'en' | 'es';
}): Promise<{ subject: string; body: string }> => {
  const sys = `You are a compassionate communications assistant for GreenRoots ONG.
Draft warm, supportive health emergency messages from the finances secretary.
Respond ONLY with valid JSON: {"subject":"...","body":"..."}`;
  const usr = `Draft in ${p.lang === 'es' ? 'Spanish' : 'English'}.
Member: ${p.memberName}, Situation: ${p.situation}, ONG released: $${p.amountReleased}`;
  return JSON.parse((await callClaude(sys, usr)).replace(/```json|```/g, '').trim());
};

export const analyzeMissionData = async (p: {
  country: string;
  topZones: Array<{ name: string; score: number; gardens: number }>;
  staffEndingSoon: Array<{ name: string; endDate: string; role: string }>;
  staffStartingSoon: Array<{ name: string; startDate: string }>;
  pendingRotations: Array<{ name: string; skills: string[]; currentZone: string }>;
  lang: 'en' | 'es';
}): Promise<{ successSummary: string; staffAlert: string; rotationSuggestions: string; leadershipInsight: string }> => {
  const sys = `You are a strategic analysis assistant for GreenRoots ONG (vegetable gardening mission).
Help the CEO make data-informed decisions. Always remind them the final decision is theirs.
Respond ONLY with valid JSON.`;
  const usr = `Analyze ${p.country} branch data in ${p.lang === 'es' ? 'Spanish' : 'English'}.
Top zones: ${JSON.stringify(p.topZones)}
Ending soon: ${JSON.stringify(p.staffEndingSoon)}
Starting soon: ${JSON.stringify(p.staffStartingSoon)}
Rotation due: ${JSON.stringify(p.pendingRotations)}
JSON: {"successSummary":"...","staffAlert":"...","rotationSuggestions":"...","leadershipInsight":"..."}`;
  return JSON.parse((await callClaude(sys, usr)).replace(/```json|```/g, '').trim());
};

export const draftDocumentReminder = async (p: {
  memberName: string; documentType: string; expiryDate: string;
  daysRemaining: number; lang: 'en' | 'es';
}): Promise<{ subject: string; body: string }> => {
  const sys = `You are a helpful assistant for the immigration secretary of GreenRoots ONG.
Draft friendly document expiry reminders. Respond ONLY with JSON: {"subject":"...","body":"..."}`;
  const usr = `Draft in ${p.lang === 'es' ? 'Spanish' : 'English'}.
Member: ${p.memberName}, Document: ${p.documentType}, Expires: ${p.expiryDate}, Days left: ${p.daysRemaining}`;
  return JSON.parse((await callClaude(sys, usr)).replace(/```json|```/g, '').trim());
};

export const draftSupplyAlert = async (p: {
  zone: string; itemName: string; currentStock: number;
  minimumStock: number; lang: 'en' | 'es';
}): Promise<{ subject: string; body: string }> => {
  const sys = `You are a helpful assistant for the materials secretary of GreenRoots ONG.
Draft concise supply alert messages. Respond ONLY with JSON: {"subject":"...","body":"..."}`;
  const usr = `Draft in ${p.lang === 'es' ? 'Spanish' : 'English'}.
Zone: ${p.zone}, Item: ${p.itemName}, Stock: ${p.currentStock}, Minimum: ${p.minimumStock}`;
  return JSON.parse((await callClaude(sys, usr)).replace(/```json|```/g, '').trim());
};
