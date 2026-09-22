import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return Response.json({ error: "Ask Luka is not configured." }, { status: 500, headers: corsHeaders });
    const { question, pageText, pageImage, documentName, pageNumber, action } = await request.json();
    if (action !== "ocr" && !question?.trim()) return Response.json({ error: "Enter a question first." }, { status: 400, headers: corsHeaders });
    const prompt = action === "ocr"
      ? "Transcribe all visible text from this PDF page exactly, preserving reading order. Return only the transcription."
      : `You are Luka, an accounting document assistant. Answer only from the supplied PDF page context. If the answer is not present, say so clearly. Keep the answer concise.\n\nDocument: ${documentName}\nPage: ${pageNumber}\nQuestion: ${question}\n\nPage context:\n${String(pageText ?? "").slice(0, 30000)}`;
    const input = pageImage
      ? [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: pageImage }] }]
      : prompt;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input,
      }),
    });
    if (!response.ok) {
      const raw = await response.text();
      let message = raw;
      try { message = JSON.parse(raw)?.message ?? JSON.parse(raw)?.error?.message ?? raw; } catch { /* keep safe gateway text */ }
      return Response.json({ error: message || "Ask Luka could not answer this question." }, { status: response.status, headers: corsHeaders });
    }

    const reader = response.body?.getReader();
    if (!reader) return Response.json({ error: "Ask Luka returned no response." }, { status: 502, headers: corsHeaders });
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let reasoning = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "response.output_text.delta") answer += event.delta ?? "";
          if (event.type === "response.reasoning_summary_text.delta") reasoning += event.delta ?? "";
        } catch { /* ignore incomplete event */ }
      }
    }
    return Response.json({ result: answer.trim() || reasoning.trim() || "No answer was returned." }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ask Luka failed." }, { status: 500, headers: corsHeaders });
  }
});