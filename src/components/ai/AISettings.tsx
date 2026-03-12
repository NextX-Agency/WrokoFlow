import { useState, useEffect } from "react"
import { useAISettings, useSaveAISettings, useTestAIConnection } from "@/hooks/useAI"
import { DEFAULT_MODELS, PROVIDER_LABELS, fetchAvailableModels, type AIProvider, type AvailableModel } from "@/lib/ai"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Brain, Loader2, CheckCircle2, XCircle } from "lucide-react"

const PROVIDER_OPTIONS: AIProvider[] = ["gemini", "groq", "openrouter"]

export function AISettings() {
  const { data: settings, isLoading } = useAISettings()
  const saveSettings = useSaveAISettings()
  const testConnection = useTestAIConnection()

  const [provider, setProvider] = useState<AIProvider>("gemini")
  const [model, setModel] = useState(DEFAULT_MODELS.gemini)
  const [synced, setSynced] = useState(false)
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)

  // Fetch available models on mount
  useEffect(() => {
    setModelsLoading(true)
    fetchAvailableModels().then((models) => {
      setAvailableModels(models)
      setModelsLoading(false)
    })
  }, [])

  // Sync form when settings load
  useEffect(() => {
    if (settings && !synced) {
      setProvider(settings.provider as AIProvider)
      setModel(settings.model)
      setSynced(true)
    }
  }, [settings, synced])

  // Update model when provider changes
  const handleProviderChange = (val: string) => {
    const p = val as AIProvider
    setProvider(p)
    // Auto-select first model for this provider, or fallback to default
    const firstModelForProvider = availableModels.find((m) => m.provider === p)?.id || DEFAULT_MODELS[p]
    setModel(firstModelForProvider)
  }

  // Get models for current provider
  const modelsForProvider = availableModels.filter((m) => m.provider === provider)

  const handleSave = () => {
    saveSettings.mutate({ provider, model })
  }

  const handleTest = () => {
    testConnection.mutate({ provider, model })
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[#A09890]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading AI settings...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#B07C4F]/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-[#B07C4F]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#2D2A26]">AI Assistant</h3>
          <p className="text-sm text-[#7A7267]">
            Pick your preferred AI provider — we handle the rest.
          </p>
        </div>
      </div>

      {/* Provider */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#4A4540]">Provider</Label>
        <Select value={provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Model */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#4A4540]">
          Model {modelsLoading && <Loader2 className="w-3 h-3 inline animate-spin ml-1" />}
        </Label>
        {modelsForProvider.length > 0 ? (
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelsForProvider.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    {m.name}
                    {m.speed && <span className="text-xs text-[#A09890]">({m.speed})</span>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODELS[provider]}
            className="text-sm"
          />
        )}
        {modelsForProvider.length > 0 && (
          <p className="text-xs text-[#A09890]">
            {modelsForProvider.find((m) => m.id === model)?.description || ""}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saveSettings.isPending}
          className="bg-[#B07C4F] hover:bg-[#9A6A40] text-white"
        >
          {saveSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Save Preferences
        </Button>
        <Button
          onClick={handleTest}
          disabled={testConnection.isPending}
          variant="outline"
          className="border-[#E4DDD2]"
        >
          {testConnection.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : testConnection.isSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
          ) : testConnection.isError ? (
            <XCircle className="w-4 h-4 text-red-500 mr-2" />
          ) : null}
          Test Connection
        </Button>
      </div>

      {/* Info */}
      <div className="bg-[#FAF8F5] rounded-xl p-4 text-xs text-[#7A7267] space-y-2">
        <p className="font-medium text-[#4A4540]">
          {modelsLoading ? "Fetching free models..." : "Available free-tier models for each provider:"}
        </p>
        {!modelsLoading && availableModels.length > 0 && (
          <div className="space-y-1">
            {(Object.keys(DEFAULT_MODELS) as AIProvider[]).map((p) => {
              const pModels = availableModels.filter((m) => m.provider === p)
              const modelNames = pModels.slice(0, 2).map((m) => m.name).join(", ")
              return (
                <p key={p}>
                  <span className="font-medium">{PROVIDER_LABELS[p]}</span> — {modelNames || "(No free models found)"}
                </p>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
