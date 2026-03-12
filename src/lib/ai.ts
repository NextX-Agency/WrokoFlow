/**
 * App-provided AI client — calls backend Edge Function.
 * API keys are stored server-side, users just pick provider + model.
 */

export type AIProvider = "gemini" | "groq" | "openrouter"

export interface AISettings {
  provider: AIProvider
  model: string
}

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_call_id?: string
}

export interface AIToolParameter {
  type: string
  description?: string
  enum?: string[]
  items?: AIToolParameter
}

export interface AITool {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, AIToolParameter>
    required?: string[]
  }
}

export interface AIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AIResponse {
  content: string | null
  toolCalls: AIToolCall[]
}

// ─── Default free-tier models per provider ─────────────────────────────────

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: "gemini-2.0-flash-lite",
  groq: "llama-3.1-8b-instant",
  openrouter: "mistralai/mistral-small-3.1-24b-instruct:free",
}

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: "Google Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
}

// ─── Available Models ──────────────────────────────────────────────────────

export interface AvailableModel {
  id: string
  name: string
  provider: AIProvider
  description?: string
  speed?: "fast" | "normal" | "slow"
}

/**
 * Fetch available free models from all providers.
 * Returns curated list of top recommended models (fresh per session).
 */
export async function fetchAvailableModels(): Promise<AvailableModel[]> {
  const models: AvailableModel[] = []

  // Fetch from each provider in parallel
  const results = await Promise.allSettled([
    fetchGeminiModels(),
    fetchGroqModels(),
    fetchOpenRouterModels(),
  ])

  for (const result of results) {
    if (result.status === "fulfilled") {
      models.push(...result.value)
    }
  }

  // Fallback to defaults if nothing fetched
  if (models.length === 0) {
    models.push(
      { id: DEFAULT_MODELS.gemini, name: "Gemini 2.0 Flash Lite", provider: "gemini", speed: "fast" },
      { id: DEFAULT_MODELS.groq, name: "Llama 3.1 8B Instant (Groq)", provider: "groq", speed: "fast" },
      { id: DEFAULT_MODELS.openrouter, name: "Llama 3.1 8B (OpenRouter)", provider: "openrouter", speed: "fast" }
    )
  }

  // Sort by speed (fast first) then return top 10
  return models
    .sort((a, b) => {
      const speedOrder = { fast: 0, normal: 1, slow: 2 }
      return (speedOrder[a.speed || "normal"] || 1) - (speedOrder[b.speed || "normal"] || 1)
    })
    .slice(0, 10)
}

async function fetchGeminiModels(): Promise<AvailableModel[]> {
  // Gemini free tier models (stable, from docs)
  return [
    {
      id: "gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash Lite",
      provider: "gemini",
      description: "Fastest, best for real-time",
      speed: "fast",
    },
    {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      provider: "gemini",
      description: "Fast, 1M token window",
      speed: "fast",
    },
  ]
}

async function fetchGroqModels(): Promise<AvailableModel[]> {
  // Groq free tier models (stable, from docs)
  return [
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B",
      provider: "groq",
      description: "Lightning fast inference",
      speed: "fast",
    },
    {
      id: "llama-3.1-70b-versatile",
      name: "Llama 3.1 70B",
      provider: "groq",
      description: "More powerful, still fast",
      speed: "normal",
    },
    {
      id: "mixtral-8x7b-32768",
      name: "Mixtral 8x7B",
      provider: "groq",
      description: "Specialized reasoning",
      speed: "normal",
    },
  ]
}

async function fetchOpenRouterModels(): Promise<AvailableModel[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "User-Agent": "WrokoFlow",
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    })

    if (!res.ok) throw new Error("OpenRouter API error")

    interface OpenRouterModel {
      id: string
      name: string
      description?: string
      pricing?: { prompt: string }
    }

    const data = (await res.json()) as { data: OpenRouterModel[] }

    // Filter to free models (pricing.prompt === "0") and take top 8
    const freeModels = (data.data || [])
      .filter((m) => m.pricing?.prompt === "0")
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        name: m.name?.replace(/\(via.*\)/, "").trim() || m.id,
        provider: "openrouter" as AIProvider,
        description: m.description?.substring(0, 60),
        speed: (m.id.includes("8b") ? "fast" : m.id.includes("70b") ? "normal" : "slow") as "fast" | "normal" | "slow",
      }))

    return freeModels.length > 0
      ? freeModels
      : [
          {
            id: "mistralai/mistral-small-3.1-24b-instruct:free",
            name: "Mistral Small 3.1",
            provider: "openrouter" as AIProvider,
            speed: "normal" as const,
          },
        ]
  } catch {
    // Fallback to known free models if API fails
    return [
      {
        id: "mistralai/mistral-small-3.1-24b-instruct:free",
        name: "Mistral Small 3.1",
        provider: "openrouter" as AIProvider,
        speed: "normal" as const,
      },
      {
        id: "google/gemma-3-12b-it:free",
        name: "Gemma 3 12B",
        provider: "openrouter" as AIProvider,
        speed: "fast" as const,
      },
    ]
  }
}

// ─── Main entry point ──────────────────────────────────────────────────────

import { supabase } from "./supabase"

export async function callAI(
  messages: AIMessage[],
  tools: AITool[],
  settings: AISettings
): Promise<AIResponse> {
  // Get current session for authentication
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error("Not authenticated")
  }

  // Call Supabase Edge Function with app-provided API keys
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      provider: settings.provider,
      model: settings.model,
      messages,
      tools,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (error) {
    // Extract the actual error body from FunctionsHttpError (supabase-js wraps it)
    let detail = error.message
    try {
      if ("context" in error && error.context instanceof Response) {
        const body = await (error.context as Response).json()
        if (body?.error) detail = body.error
      }
    } catch { /* ignore body parse errors */ }
    throw new Error(`AI call failed: ${detail}`)
  }

  return data as AIResponse
}

// ─── Test connection ───────────────────────────────────────────────────────

export async function testAIConnection(settings: AISettings): Promise<boolean> {
  try {
    const result = await callAI(
      [{ role: "user", content: "Say hello in exactly one word." }],
      [],
      settings
    )
    return !!(result.content || result.toolCalls.length)
  } catch {
    return false
  }
}

// ─── OpenAI-compatible (OpenAI, Groq, OpenRouter) ──────────────────────────
// Note: This is called via backend Edge Function, not directly from client

const OPENAI_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
}

// @ts-ignore - reserved for future use via backend Edge Function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callOpenAICompatible(
  messages: AIMessage[],
  tools: AITool[],
  settings: AISettings
): Promise<AIResponse> {
  const endpoint = OPENAI_ENDPOINTS[settings.provider]
  if (!endpoint) throw new Error(`No endpoint for provider: ${settings.provider}`)

  const body: Record<string, unknown> = {
    model: settings.model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    })),
  }

  if (tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))
    body.tool_choice = "auto"
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  
  // Note: API key is passed by the backend Edge Function, not included here

  if (settings.provider === "openrouter") {
    headers["HTTP-Referer"] = window.location.origin
    headers["X-Title"] = "WrokoFlow"
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI request failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]?.message

  if (!choice) throw new Error("No response from AI")

  const toolCalls: AIToolCall[] = (choice.tool_calls || []).map(
    (tc: { id: string; function: { name: string; arguments: string } }) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    })
  )

  return {
    content: choice.content || null,
    toolCalls,
  }
}

// ─── Google Gemini ─────────────────────────────────────────────────────────
// Note: Gemini is called via backend Edge Function, not directly from client

// @ts-ignore - reserved for future use via backend Edge Function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callGemini(
  messages: AIMessage[],
  tools: AITool[],
  settings: AISettings
): Promise<AIResponse> {
  // API key is managed by backend, not exposed on client
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent`

  // Convert messages to Gemini format
  const systemInstruction = messages.find((m) => m.role === "system")
  const conversationMessages = messages.filter((m) => m.role !== "system")

  const contents = conversationMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const body: Record<string, unknown> = { contents }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] }
  }

  if (tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: tools.map((t) => ({
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
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini request failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]?.content
  if (!candidate) throw new Error("No response from Gemini")

  let content: string | null = null
  const toolCalls: AIToolCall[] = []

  for (const part of candidate.parts || []) {
    if (part.text) {
      content = (content || "") + part.text
    }
    if (part.functionCall) {
      toolCalls.push({
        id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
      })
    }
  }

  return { content, toolCalls }
}
