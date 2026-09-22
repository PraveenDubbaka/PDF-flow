import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  text: string;
  action: 'replace-we' | 'shorter' | 'improve' | 'summarize' | 'draft';
}

const actionPrompts: Record<string, string> = {
  'replace-we': `You are a text editor. Replace all first-person plural pronouns (we, our, us) with first-person singular (I, my, me). Only output the modified text, nothing else.`,
  'shorter': `You are a concise editor. Make this text shorter while keeping the core meaning. Reduce it to about 50-70% of the original length. Only output the shortened text, nothing else.`,
  'improve': `You are a professional writing assistant. Improve the grammar, clarity, and flow of this text while keeping the original meaning and tone. Only output the improved text, nothing else.`,
  'summarize': `You are a summarizer. Create a brief, clear summary of this text in 1-2 sentences. Start with "Summary: ". Only output the summary, nothing else.`,
  'draft': `You are a professional writer. Based on the context or topic provided, generate a well-written, clear, and professional response. If the input is empty or unclear, write a general compliance/verification statement. Only output the drafted text, nothing else.`
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { text, action }: RequestBody = await req.json();
    
    console.log(`Processing AI action: ${action}, text length: ${text?.length || 0}`);
    
    if (!action || !actionPrompts[action]) {
      return new Response(
        JSON.stringify({ error: 'Invalid action specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = actionPrompts[action];
    const userMessage = text || 'Write a professional compliance verification statement.';

    

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || text;

    console.log(`AI action ${action} completed successfully`);

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing AI request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
