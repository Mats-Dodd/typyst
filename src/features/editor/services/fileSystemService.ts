import { generateJSON } from '@tiptap/html'
import { extensions } from '../../../extensions/extensions'
import { marked } from 'marked'
import { convertToHtml } from 'mammoth'
import { Editor } from '@tiptap/core'
import TurndownService from 'turndown'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx'

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

export async function convertJsonToDocx(json: JSONContent): Promise<Blob> {
    // First convert JSON to HTML using TipTap's HTML output
    const tempEditor = new Editor({
        extensions,
        content: json
    })
    const html = tempEditor.getHTML()
    tempEditor.destroy()

    // Parse the HTML and convert it to DOCX format
    const doc = new Document({
        sections: [{
            children: parseHtmlToDocxElements(html)
        }]
    })

    // Generate the DOCX file as a Blob
    return await Packer.toBlob(doc)
}

function parseHtmlToDocxElements(html: string): Paragraph[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const elements: Paragraph[] = []

    function processNode(node: Node): TextRun | TextRun[] {
        if (node.nodeType === Node.TEXT_NODE) {
            return new TextRun({ text: node.textContent || '' })
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            const tagName = element.tagName.toLowerCase()

            switch (tagName) {
                case 'strong':
                case 'b':
                    return new TextRun({
                        text: element.textContent || '',
                        bold: true
                    })
                case 'em':
                case 'i':
                    return new TextRun({
                        text: element.textContent || '',
                        italics: true
                    })
                case 'u':
                    return new TextRun({
                        text: element.textContent || '',
                        underline: {
                            type: UnderlineType.SINGLE
                        }
                    })
                case 'code':
                    return new TextRun({
                        text: element.textContent || '',
                        font: 'Courier New'
                    })
                default:
                    return new TextRun({ text: element.textContent || '' })
            }
        }

        return new TextRun({ text: '' })
    }

    function processBlock(node: Node): Paragraph | Paragraph[] {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            const tagName = element.tagName.toLowerCase()

            switch (tagName) {
                case 'h1':
                    return new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        children: Array.from(element.childNodes).map(n => processNode(n)).flat()
                    })
                case 'h2':
                    return new Paragraph({
                        heading: HeadingLevel.HEADING_2,
                        children: Array.from(element.childNodes).map(n => processNode(n)).flat()
                    })
                case 'h3':
                    return new Paragraph({
                        heading: HeadingLevel.HEADING_3,
                        children: Array.from(element.childNodes).map(n => processNode(n)).flat()
                    })
                case 'p':
                    return new Paragraph({
                        children: Array.from(element.childNodes).map(n => processNode(n)).flat()
                    })
                case 'blockquote':
                    return new Paragraph({
                        children: Array.from(element.childNodes).map(n => processNode(n)).flat(),
                        indent: { left: 720 } // 720 twips = 0.5 inch
                    })
                case 'ul':
                    return Array.from(element.children).map(li => 
                        new Paragraph({
                            children: Array.from(li.childNodes).map(n => processNode(n)).flat(),
                            bullet: { level: 0 }
                        })
                    )
                case 'ol':
                    return Array.from(element.children).map(li => 
                        new Paragraph({
                            children: Array.from(li.childNodes).map(n => processNode(n)).flat(),
                            numbering: { reference: '1', level: 0 }
                        })
                    )
                default:
                    return new Paragraph({
                        children: [new TextRun({ text: element.textContent || '' })]
                    })
            }
        }

        return new Paragraph({
            children: [new TextRun({ text: '' })]
        })
    }

    for (const child of Array.from(doc.body.childNodes)) {
        const element = processBlock(child)
        if (Array.isArray(element)) {
            elements.push(...element)
        } else {
            elements.push(element)
        }
    }

    return elements
}
