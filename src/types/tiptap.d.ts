declare module "@tiptap/core" {
    import {Extension as BaseExtension} from "@tiptap/core";
    export {Editor} from "@tiptap/core";
    export const Extension: typeof BaseExtension;
}

declare module "@tiptap/extension-color" {
    import {Extension} from "@tiptap/core";
    const Color: Extension;
    export default Color;
}

declare module "@tiptap/extension-list-item" {
    import {Extension} from "@tiptap/core";
    const ListItem: Extension;
    export default ListItem;
}

declare module "@tiptap/extension-text-style" {
    import {Extension} from "@tiptap/core";
    const TextStyle: Extension;
    export default TextStyle;
}

declare module "@tiptap/starter-kit" {
    import {Extension} from "@tiptap/core";
    const StarterKit: Extension;
    export default StarterKit;
}

declare module "@tiptap/react" {
    import {Editor} from "@tiptap/core";
    import React from "react";

    export interface EditorProviderProps {
        children?: React.ReactNode;
        slotBefore?: React.ReactNode;
        extensions?: any[];
        content?: string;
        onUpdate?: (props: {editor: Editor}) => void;
        editorProps?: Record<string, any>;
    }

    export function EditorProvider(props: EditorProviderProps): JSX.Element;
    export function useCurrentEditor(): {editor: Editor | null};
} 