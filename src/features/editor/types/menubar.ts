import type { Editor as EditorType } from '@tiptap/core';

export interface MenuBarProps {
    showRawOutput: boolean;
    setShowRawOutput: (show: boolean) => void;
    currentFilePath?: string;
    onSave?: () => void;
    onFileNameChange?: (newPath: string) => void;
}

export interface FileControlsProps {
    editor: EditorType;
    currentFilePath?: string;
    onSave?: () => void;
    onFileNameChange?: (newPath: string) => void;
}

export interface EditorControlsProps {
    editor: EditorType;
    showRawOutput: boolean;
    setShowRawOutput: (show: boolean) => void;
}

export interface BranchControlsProps {
    editor: EditorType;
    currentFilePath?: string;
}

export interface BranchContextMenuProps {
    contextMenu: BranchContextMenu;
    currentBranch: string;
    onDelete: (branch: string) => void;
    onRename: (branch: string) => void;
    onClose: () => void;
}

export interface BranchContextMenu {
    branch: string;
    x: number;
    y: number;
}

export interface ThemeToggleProps {
    theme: string;
    toggleTheme: () => void;
} 