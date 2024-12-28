import { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { convertJsonToMd, convertJsonToDocx, renameFile } from '../services/fileSystemService';

export const useFileOperations = (editor: Editor | null, currentFilePath?: string, onFileNameChange?: (newPath: string) => void) => {
    const [isEditingFileName, setIsEditingFileName] = useState(false);
    const [editedFileName, setEditedFileName] = useState("");

    const getFileName = (filePath: string) => {
        const parts = filePath.split(/[/\\]/);
        const fullName = parts[parts.length - 1] || '';
        return fullName.replace(/\.[^/.]+$/, '');
    };

    const getFileExtension = (filePath: string) => {
        const match = filePath.match(/\.[^/.]+$/);
        return match ? match[0] : '';
    };

    const getDirectory = (filePath: string) => {
        const lastSlashIndex = filePath.lastIndexOf('/');
        if (lastSlashIndex === -1) {
            const lastBackslashIndex = filePath.lastIndexOf('\\');
            return lastBackslashIndex === -1 ? '' : filePath.slice(0, lastBackslashIndex);
        }
        return filePath.slice(0, lastSlashIndex);
    };

    const handleSave = async () => {
        if (!editor || !currentFilePath) {
            return;
        }
        
        try {
            const isDocx = currentFilePath.endsWith('.docx');
            
            if (isDocx) {
                const docxBlob = await convertJsonToDocx(editor.getJSON());
                const buffer = await docxBlob.arrayBuffer();
                const result = await window.fs.writeBuffer(currentFilePath, buffer);
                
                if (!result.success) {
                    console.error('Failed to save DOCX file:', result.error);
                    alert('Failed to save file. Please try again.');
                }
            } else {
                const markdown = await convertJsonToMd(editor.getJSON());
                const result = await window.fs.writeFile(currentFilePath, markdown);
                
                if (!result.success) {
                    console.error('Failed to save file:', result.error);
                    alert('Failed to save file. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file. Please try again.');
        }
    };

    const handleFileNameSubmit = async () => {
        if (currentFilePath && editedFileName && onFileNameChange && editor) {
            const directory = getDirectory(currentFilePath);
            const extension = getFileExtension(currentFilePath);
            const newPath = directory 
                ? `${directory}/${editedFileName}${extension}`
                : `${editedFileName}${extension}`;
            
            try {
                const success = await renameFile(currentFilePath, newPath, editor.getJSON());
                if (success) {
                    onFileNameChange(newPath);
                } else {
                    alert('Failed to rename file. Please try again.');
                }
            } catch (error) {
                console.error('Error renaming file:', error);
                alert('Error renaming file. Please try again.');
            }
        }
        setIsEditingFileName(false);
    };

    const handleFileNameKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleFileNameSubmit();
        } else if (e.key === 'Escape') {
            setIsEditingFileName(false);
        }
    };

    const displayFileName = currentFilePath ? getFileName(currentFilePath) : "Untitled";

    return {
        isEditingFileName,
        setIsEditingFileName,
        editedFileName,
        setEditedFileName,
        displayFileName,
        handleSave,
        handleFileNameSubmit,
        handleFileNameKeyDown,
    };
}; 