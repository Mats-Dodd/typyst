import { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { ALIGNMENT_OPTIONS } from '../constants/menubar';

export const useEditorControls = (editor: Editor | null) => {
    const [showAlignMenu, setShowAlignMenu] = useState(false);

    const handleAlignment = (alignment: string) => {
        if (!editor) return;
        editor.chain().focus().setTextAlign(alignment).run();
        setShowAlignMenu(false);
    };

    const toggleBold = () => {
        if (!editor) return;
        editor.chain().focus().toggleBold().run();
    };

    const toggleItalic = () => {
        if (!editor) return;
        editor.chain().focus().toggleItalic().run();
    };

    const toggleStrike = () => {
        if (!editor) return;
        editor.chain().focus().toggleStrike().run();
    };

    const toggleBulletList = () => {
        if (!editor) return;
        editor.chain().focus().toggleBulletList().run();
    };

    const toggleOrderedList = () => {
        if (!editor) return;
        editor.chain().focus().toggleOrderedList().run();
    };

    const toggleCodeBlock = () => {
        if (!editor) return;
        editor.chain().focus().toggleCodeBlock().run();
    };

    const undo = () => {
        if (!editor) return;
        editor.chain().focus().undo().run();
    };

    const redo = () => {
        if (!editor) return;
        editor.chain().focus().redo().run();
    };

    return {
        showAlignMenu,
        setShowAlignMenu,
        handleAlignment,
        toggleBold,
        toggleItalic,
        toggleStrike,
        toggleBulletList,
        toggleOrderedList,
        toggleCodeBlock,
        undo,
        redo,
        alignmentOptions: ALIGNMENT_OPTIONS,
        canUndo: editor?.can().undo() ?? false,
        canRedo: editor?.can().redo() ?? false,
        isActive: {
            bold: editor?.isActive('bold') ?? false,
            italic: editor?.isActive('italic') ?? false,
            strike: editor?.isActive('strike') ?? false,
            bulletList: editor?.isActive('bulletList') ?? false,
            orderedList: editor?.isActive('orderedList') ?? false,
            codeBlock: editor?.isActive('codeBlock') ?? false,
        },
    };
}; 