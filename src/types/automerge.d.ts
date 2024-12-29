declare module '@automerge/automerge/automerge.wasm.base64.js' {
    export const automergeWasmBase64: string
}

declare module '@automerge/automerge/slim' {
    export * from '@automerge/automerge'
    export { next } from '@automerge/automerge'
}

declare module '@automerge/automerge' {
    export interface Doc<T> {
        [key: string]: any
    }
    
    export interface Text {
        toString(): string
        get length(): number
        insertAt(index: number, ...values: string[]): void
        deleteAt(index: number, count: number): void
    }
    
    export const next: {
        init<T>(): Doc<T>
        change<T>(doc: Doc<T>, message: string | ((doc: T) => void)): Doc<T>
        save(doc: Doc<any>): Uint8Array
        load<T>(data: Uint8Array): Doc<T>
        initializeBase64Wasm(base64Wasm: string): Promise<void>
        Text: {
            new(): Text
        }
    }
} 