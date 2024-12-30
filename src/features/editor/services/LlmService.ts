import { electronLlmRpc } from '../../../rpc/llmRpc'
import { EditorContext } from '../types'

interface AutocompleteResponse {
  text?: string;
  error?: string;
}

export class LlmService {
  static async getAutocompletion(params: EditorContext): Promise<AutocompleteResponse> {
    try {
      const response = await electronLlmRpc.autocomplete(params)
      return response
    } catch (err) {
      console.error("Autocomplete error:", err)
      return { error: "Failed to communicate with autocomplete service" }
    }
  }
} 