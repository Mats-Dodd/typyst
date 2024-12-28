import React from 'react';
import { BiSave } from 'react-icons/bi';
import { useFileOperations } from '../../hooks/useFileOperations';
import { TOOLTIPS } from '../../constants/menubar';
import type { FileControlsProps } from '../../types/menubar';
import styles from '../../../../styles/menubar/FileControls.module.css';
import menuStyles from '../../../../styles/menubar/MenuBar.module.css';

export const FileControls: React.FC<FileControlsProps> = ({
    editor,
    currentFilePath,
    onSave,
    onFileNameChange,
}) => {
    const {
        isEditingFileName,
        setIsEditingFileName,
        editedFileName,
        setEditedFileName,
        displayFileName,
        handleSave,
        handleFileNameSubmit,
        handleFileNameKeyDown,
    } = useFileOperations(editor, currentFilePath, onFileNameChange);

    const handleFileNameClick = () => {
        if (currentFilePath) {
            setEditedFileName(displayFileName);
            setIsEditingFileName(true);
        }
    };

    return (
        <>
            <button
                onClick={handleSave}
                className={menuStyles['menu-button']}
                disabled={!currentFilePath}
                data-tooltip={TOOLTIPS.SAVE}
            >
                <BiSave />
            </button>
            <div className={styles['file-name-container']}>
                {isEditingFileName ? (
                    <input
                        type="text"
                        className={styles['file-name-input']}
                        value={editedFileName}
                        onChange={(e) => setEditedFileName(e.target.value)}
                        onBlur={handleFileNameSubmit}
                        onKeyDown={handleFileNameKeyDown}
                        autoFocus
                    />
                ) : (
                    <div 
                        className={styles['file-name-display']}
                        onClick={handleFileNameClick}
                        title="Click to rename"
                    >
                        {displayFileName}
                    </div>
                )}
            </div>
        </>
    );
}; 