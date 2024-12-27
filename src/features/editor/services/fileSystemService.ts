import { generateJSON } from '@tiptap/html'
import { extensions } from '../../../extensions/extensions'
import { marked } from 'marked'
import { convertToHtml } from 'mammoth'

export async function convertMdToJson(md: string): Promise<string> {
    const html = await Promise.resolve(marked.parse(md))
    return JSON.stringify(generateJSON(html, extensions))
}

export async function convertDocxToJson(buffer: ArrayBuffer): Promise<string> {
    try {
        const result = await convertToHtml({ arrayBuffer: buffer })
        return JSON.stringify(generateJSON(result.value, extensions))
    } catch (error) {
        console.error('Error converting DOCX to HTML:', error)
        throw error
    }
}
