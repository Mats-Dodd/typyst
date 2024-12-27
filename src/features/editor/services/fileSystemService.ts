import { generateJSON } from '@tiptap/html'
import { extensions } from '../../../extensions/extensions'
import { marked } from 'marked'
import { convertToHtml } from 'mammoth'
import { Editor } from '@tiptap/core'
import TurndownService from 'turndown'

interface JSONContent {
    type: string;
    content?: JSONContent[];
    [key: string]: any;
}

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

export async function convertJsonToMd(json: JSONContent): Promise<string> {
    // Convert JSON to HTML using TipTap's HTML output
    const tempEditor = new Editor({
        extensions,
        content: json
    })
    const html = tempEditor.getHTML()
    tempEditor.destroy()

    // Convert HTML to Markdown using Turndown
    const turndownService = new TurndownService()
    return turndownService.turndown(html)
}
