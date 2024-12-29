import { useState, useEffect } from 'react';
import { Editor as TiptapEditor } from '@tiptap/core';
import { versionControlService } from '../services/versionControlService';
import type { BranchInfo } from '../../../../electron/types/versioning';

export const useBranchOperations = (editor: TiptapEditor | null, currentFilePath?: string) => {
    const [currentBranch, setCurrentBranch] = useState<string>('main');
    const [branches, setBranches] = useState<string[]>(['main']);
    const [showBranchSelector, setShowBranchSelector] = useState(false);
    const [documentId, setDocumentId] = useState<string | null>(null);

    const loadBranches = async () => {
        if (!currentFilePath || !editor) return;

        try {
            const doc = await versionControlService.getDocumentByPath(currentFilePath);
            if (!doc) {
                // Initialize new document if it doesn't exist
                const newDoc = await versionControlService.createDocument(currentFilePath);
                setDocumentId(newDoc.id);
                setCurrentBranch(newDoc.currentBranch);
                setBranches(Object.keys(newDoc.branches));
            } else {
                setDocumentId(doc.id);
                setCurrentBranch(doc.currentBranch);
                setBranches(Object.keys(doc.branches));
            }
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    };

    const getNextBranchNumber = (): number => {
        const branchNumbers = branches
            .filter(b => b.startsWith('branch-'))
            .map(b => parseInt(b.replace('branch-', ''), 10))
            .filter(n => !isNaN(n));

        return branchNumbers.length > 0 ? Math.max(...branchNumbers) + 1 : 1;
    };

    const handleBranchSwitch = async (branchName: string) => {
        if (!documentId || !editor || currentBranch === branchName) return;

        try {
            // Save current content before switching
            const content = editor.getJSON();
            await versionControlService.saveContent(documentId, content);

            // Switch branch
            await versionControlService.switchBranch(documentId, branchName);

            // Load new branch content
            const newContent = await versionControlService.loadContent(documentId);
            if (newContent) {
                editor.commands.setContent(newContent);
            }

            setCurrentBranch(branchName);
        } catch (error) {
            console.error('Error switching branch:', error);
        }
    };

    const handleCreateBranch = async () => {
        if (!documentId || !editor) return;

        try {
            const branchNumber = getNextBranchNumber();
            const newBranchName = `branch-${branchNumber}`;

            // Create new branch
            await versionControlService.createBranch(documentId, newBranchName);

            // Save current content to new branch
            const content = editor.getJSON();
            await versionControlService.saveContent(documentId, content);

            // Update UI
            setBranches(prev => [...prev, newBranchName]);
            await handleBranchSwitch(newBranchName);
        } catch (error) {
            console.error('Error creating branch:', error);
        }
    };

    const handleBranchDelete = async (branchName: string) => {
        if (!documentId || branchName === 'main') return;

        try {
            // Switch to main before deleting if we're on the branch to be deleted
            if (currentBranch === branchName) {
                await handleBranchSwitch('main');
            }

            // Delete branch
            const doc = await versionControlService.getDocument(documentId);
            if (doc) {
                const updatedBranches = { ...doc.branches };
                delete updatedBranches[branchName];
                await versionControlService.updateDocument(documentId, { branches: updatedBranches });
                setBranches(Object.keys(updatedBranches));
            }
        } catch (error) {
            console.error('Error deleting branch:', error);
        }
    };

    const handleBranchRename = async (oldName: string, newName: string) => {
        if (!documentId || oldName === 'main') return;

        try {
            const doc = await versionControlService.getDocument(documentId);
            if (doc && doc.branches[oldName]) {
                const branchInfo: BranchInfo = {
                    lastModified: Date.now(),
                    head: doc.branches[oldName].head
                };
                
                const updatedBranches = { ...doc.branches };
                updatedBranches[newName] = branchInfo;
                delete updatedBranches[oldName];
                
                await versionControlService.updateDocument(documentId, { 
                    branches: updatedBranches,
                    currentBranch: currentBranch === oldName ? newName : currentBranch
                });

                setBranches(Object.keys(updatedBranches));
                if (currentBranch === oldName) {
                    setCurrentBranch(newName);
                }
            }
        } catch (error) {
            console.error('Error renaming branch:', error);
        }
    };

    const getDocumentId = () => documentId;

    useEffect(() => {
        loadBranches();
    }, [currentFilePath, editor]);

    return {
        currentBranch,
        branches,
        showBranchSelector,
        setShowBranchSelector,
        handleBranchSwitch,
        handleCreateBranch,
        handleBranchDelete,
        handleBranchRename,
        getDocumentId
    };
}; 