import { 
    BiAlignLeft, 
    BiAlignMiddle, 
    BiAlignRight, 
    BiAlignJustify 
} from "react-icons/bi";

export const ALIGNMENT_OPTIONS = [
    { icon: BiAlignLeft, value: 'left', tooltip: 'Align Left (⌘⇧L)' },
    { icon: BiAlignMiddle, value: 'center', tooltip: 'Align Center (⌘⇧E)' },
    { icon: BiAlignRight, value: 'right', tooltip: 'Align Right (⌘⇧R)' },
    { icon: BiAlignJustify, value: 'justify', tooltip: 'Justify (⌘⇧J)' },
];

export const TOOLTIPS = {
    SAVE: 'Save (⌘S)',
    UNDO: 'Undo (⌘Z)',
    REDO: 'Redo (⌘⇧Z)',
    BOLD: 'Bold (⌘B)',
    ITALIC: 'Italic (⌘I)',
    STRIKE: 'Strikethrough (⌘⇧X)',
    BULLET_LIST: 'Bullet List (⌘⇧8)',
    ORDERED_LIST: 'Ordered List (⌘⇧7)',
    CODE_BLOCK: 'Code Block',
    RAW_OUTPUT: 'Toggle Raw Output',
} as const; 