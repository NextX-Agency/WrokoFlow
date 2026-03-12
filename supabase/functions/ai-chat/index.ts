import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create authenticated Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Extract JWT and validate the user explicitly (works across all supabase-js versions in Deno)
    const jwt = authHeader.replace(/^[Bb]earer\s+/, "")
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Parse request body
    const body = await req.json()
    const { provider, model, messages, tools } = body

    if (!provider || !model || !messages) {
      return new Response(JSON.stringify({ error: "Missing required fields: provider, model, messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let response

    switch (provider) {
      case "gemini":
        response = await callGemini(model, messages, tools)
        break
      case "groq":
        response = await callGroq(model, messages, tools)
        break
      case "openrouter":
        response = await callOpenRouter(model, messages, tools)
        break
      default:
        return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    // Return 429 for rate limit errors so the client can detect and fall back to another provider
    const status = msg.startsWith("RATE_LIMIT") ? 429 : 500
    console.error("Error:", msg)
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

async function callGemini(model: string, messages: unknown[], tools: unknown[]) {
  const apiKey = Deno.env.get("GEMINI_API_KEY")
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured")

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const systemPrompt = messages.find((m: any) => m.role === "system")
  const userMessages = messages.filter((m: any) => m.role !== "system")

  const contents = userMessages.map((m: any) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }))

  const request: any = {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt.content }] } : undefined,
  }

  if (tools && tools.length > 0) {
    request.tools = [
      {
        functionDeclarations: tools.map((t: any) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ]
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const error = await res.text()
    if (res.status === 429) throw new Error(`RATE_LIMIT: Gemini rate limit reached. Try again shortly or switch provider.`)
    throw new Error(`Gemini API error: ${error}`)
  }
  let content = ""
  const toolCalls: any[] = []

  const candidate = data.candidates?.[0]
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) {
        content += part.text
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Math.random().toString(36).slice(2, 9)}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        })
      }
    }
  }

  return { content: content || null, toolCalls }
}

async function callGroq(model: string, messages: unknown[], tools: unknown[]) {
  const apiKey = Deno.env.get("GROQ_API_KEY")
  if (!apiKey) throw new Error("GROQ_API_KEY not configured")

  const url = "https://api.groq.com/openai/v1/chat/completions"

  const body: any = {
    model,
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  }

  if (tools && tools.length > 0) {
    body.tools = tools.map((t: any) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))
    body.tool_choice = "auto"
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.text()
    if (res.status === 429) throw new Error(`RATE_LIMIT: Groq rate limit reached. Try again shortly or switch provider.`)
    throw new Error(`Groq API error: ${error}`)
  }

  const data = await res.json()

  const message = data.choices?.[0]?.message
  let content = message?.content || ""
  const toolCalls: any[] = []

  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments,
      })
    }
  }

  return { content: content || null, toolCalls }
}

async function callOpenRouter(model: string, messages: unknown[], tools: unknown[]) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured")

  const url = "https://openrouter.ai/api/v1/chat/completions"

  const body: any = {
    model,
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  }

  if (tools && tools.length > 0) {
    body.tools = tools.map((t: any) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))
    body.tool_choice = "auto"
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://wrokoflow.com",
      "X-Title": "WrokoFlow",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.text()
    if (res.status === 429) throw new Error(`RATE_LIMIT: OpenRouter rate limit reached. Try again shortly or switch provider.`)
    throw new Error(`OpenRouter API error: ${error}`)
  }

  const data = await res.json()

  const message = data.choices?.[0]?.message
  let content = message?.content || ""
  const toolCalls: any[] = []

  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments,
      })
    }
  }

  return { content: content || null, toolCalls }
}
