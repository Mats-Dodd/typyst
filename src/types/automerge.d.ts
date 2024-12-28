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
    
    export namespace next {
        export function init<T>(): Doc<T>
        export function change<T>(doc: Doc<T>, message: string | ((doc: T) => void)): Doc<T>
        export function save(doc: Doc<any>): Uint8Array
        export function load<T>(data: Uint8Array): Doc<T>
        export function initializeBase64Wasm(base64Wasm: string): Promise<void>
        export class Text implements Text {}
    }
} 