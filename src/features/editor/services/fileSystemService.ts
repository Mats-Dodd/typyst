import { generateJSON } from '@tiptap/html'
import { extensions } from '../../../extensions/extensions'
import { marked } from 'marked'

export async function convertMdToJson(md: string): Promise<string> {
    const html = await Promise.resolve(marked.parse(md))
    return JSON.stringify(generateJSON(html, extensions))
}
