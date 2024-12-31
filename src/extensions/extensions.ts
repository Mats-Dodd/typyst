import TextStyle from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import {PredictionExtension} from "./predictions/PredictionExtension";
import { IndentExtension } from './indent/IndentExtension';
import Paragraph from '@tiptap/extension-paragraph'
import Underline from '@tiptap/extension-underline'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import python from 'highlight.js/lib/languages/python'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'



const lowlight = createLowlight(all)

lowlight.register('html', html)
lowlight.register('css', css)
lowlight.register('js', js)
lowlight.register('ts', ts)
lowlight.register('python', python)

const ValeHighlightExtension = Extension.create({
  name: 'valeHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('valeHighlight'),
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            const highlightedTexts = (window as any).currentValeHighlights || [];

            if (highlightedTexts.length === 0) return DecorationSet.empty;

            doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text || '';
                highlightedTexts.forEach((highlight: string) => {
                  let index = 0;
                  while (true) {
                    index = text.indexOf(highlight, index);
                    if (index === -1) break;

                    // Check the character after the match to ensure exact matching
                    const charAfter = text[index + highlight.length] || '';
                    const matchedText = text.slice(index, index + highlight.length);
                    
                    // Only create decoration if it's an exact match and the next character isn't a letter
                    if (matchedText === highlight && !/[a-zA-Z]/.test(charAfter)) {
                      decorations.push(
                        Decoration.inline(pos + index, pos + index + highlight.length, {
                          class: 'vale-highlight',
                          style: 'text-decoration: underline; text-decoration-style: wavy; text-decoration-color: red;'
                        })
                      );
                    }
                    index += 1; // Move by 1 to catch overlapping matches
                  }
                });
              }
            });

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});

export const extensions = [
    TextStyle,
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
        codeBlock: false, // disable the default code block to use lowlight instead,
        paragraph: false,
        doc: false,
    }),
    TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
    }),
    CodeBlockLowlight.configure({
        lowlight,
    }),
    IndentExtension,
    PredictionExtension,
    Paragraph,
    Underline,
    ValeHighlightExtension,
    Link.configure({
        openOnClick: true,
        linkOnPaste: true,
        autolink: false,
        defaultProtocol: 'https',

    }),
    Placeholder.configure({
      // Use a placeholder:
      placeholder: 'Once upon a time...',
    }),
    Typography,
    Image.configure({
      allowBase64: true,
    })
]; 