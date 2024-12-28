import { next } from '@automerge/automerge/slim'
import { automergeWasmBase64 } from '@automerge/automerge/automerge.wasm.base64.js'

let initialized = false

export async function initializeAutomerge() {
    if (initialized) return

    try {
        await next.initializeBase64Wasm(automergeWasmBase64)
        initialized = true
    } catch (error) {
        console.error('Failed to initialize Automerge WASM:', error)
        throw error
    }
}

// Re-export next as Automerge
export const Automerge = next 