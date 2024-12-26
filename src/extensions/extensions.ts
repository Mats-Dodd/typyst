import TextStyle from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import {PredictionExtension} from "./predictions/PredictionExtension";
import { IndentExtension } from './indent/IndentExtension';
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'

import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import python from 'highlight.js/lib/languages/python'


const lowlight = createLowlight(all)

lowlight.register('html', html)
lowlight.register('css', css)
lowlight.register('js', js)
lowlight.register('ts', ts)
lowlight.register('python', python)

export const extensions = [
    TextStyle,
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
        codeBlock: false, // disable the default code block to use lowlight instead
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
    Document,
    Paragraph,
    Text
]; 
