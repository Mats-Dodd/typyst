import React from 'react';
import { useCurrentEditor } from '@tiptap/react';
import { useTheme } from '../../../theme/themeContext';
import { FileControls } from './FileControls';
import { EditorControls } from './EditorControls';
import { BranchControls } from './BranchControls';
import { ThemeToggle } from './ThemeToggle';
import type { MenuBarProps } from '../../types/menubar';
import styles from '../../../../styles/menubar/MenuBar.module.css';

export function MenuBar({ 
    showRawOutput, 
    setShowRawOutput, 
    currentFilePath,
    onSave,
    onFileNameChange,
}: MenuBarProps) {
    const { editor } = useCurrentEditor();
    const { theme, toggleTheme } = useTheme();

    if (!editor) return null;

    return (
        <div className={styles['control-group']}>
            <FileControls
                editor={editor}
                currentFilePath={currentFilePath}
                onSave={onSave}
                onFileNameChange={onFileNameChange}
            />
            <div className={styles.separator} />
            <EditorControls
                editor={editor}
                showRawOutput={showRawOutput}
                setShowRawOutput={setShowRawOutput}
            />
            <div className={styles.separator} />
            <BranchControls
                editor={editor}
                currentFilePath={currentFilePath}
            />
            <ThemeToggle
                theme={theme}
                toggleTheme={toggleTheme}
            />
        </div>
    );
} 