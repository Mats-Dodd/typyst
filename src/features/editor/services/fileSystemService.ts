import { generateJSON } from '@tiptap/html'
import { extensions } from '../../../extensions/extensions'
import { marked } from 'marked'

export function convertMdToJson(md: string): string {
    // Convert markdown to HTML first
    const html = marked.parse(md)
    return JSON.stringify(generateJSON(html, extensions))
}
