import TextStyle from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import {PredictionExtension} from "./predictions/PredictionExtension";


export const extensions = [
    TextStyle,
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
     
    }),
    PredictionExtension
]; 