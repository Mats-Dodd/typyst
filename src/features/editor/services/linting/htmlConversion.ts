import { generateHTML } from '@tiptap/html'
import { extensions } from '../../../../extensions/extensions'
import { Extension } from "@tiptap/core";

export function convertJsonToHtml(json: any): string {
  const extension = extensions
  return generateHTML(json, extension)
}

