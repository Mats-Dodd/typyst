import TextStyle from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from '@tiptap/extension-text-align';
import {PredictionExtension} from "./predictions/PredictionExtension";

export const extensions = [
    TextStyle,
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
    }),
    TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
    }),
    PredictionExtension
]; 