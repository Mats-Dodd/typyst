import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/core';

export const useBranchOperations = (editor: Editor | null, currentFilePath?: string) => {
    const [currentBranch, setCurrentBranch] = useState<string>('');
    const [branches, setBranches] = useState<string[]>([]);
    const [showBranchSelector, setShowBranchSelector] = useState(false);

    const loadBranches = async () => {
        try {
            const branchList = await window.versionControl.getBranches();
            if (Array.isArray(branchList)) {
                setBranches(branchList.filter((branch): branch is string => typeof branch === 'string'));
            }
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    };

    const loadCurrentBranch = async () => {
        try {
            const branch = await window.versionControl.getCurrentBranch();
            setCurrentBranch(branch || 'main');
        } catch (error) {
            console.error('Failed to load current branch:', error);
            setCurrentBranch('main');
        }
    };

    const getNextBranchNumber = (): number => {
        const branchNumbers = branches
            .map(branch => {
                const match = branch.match(/^branch-(\d+)$/);
                const matchGroup = match?.[1];
                return matchGroup ? parseInt(matchGroup, 10) : 0;
            })
            .filter(num => num > 0);

        if (branchNumbers.length === 0) return 1;
        return Math.max(...branchNumbers) + 1;
    };

    const handleBranchSwitch = async (branchName: string) => {
        if (!editor || !currentFilePath) return;

        try {
            await window.versionControl.switchBranch(branchName);
            const content = await window.versionControl.loadDocument(branchName);
            editor.commands.setContent(content);
            setShowBranchSelector(false);
            setCurrentBranch(branchName);
        } catch (error) {
            console.error('Failed to switch branch:', error);
            alert('Failed to switch branch. Please try again.');
        }
    };

    const handleCreateBranch = async () => {
        if (!editor || !currentFilePath) return;

        try {
            const nextNumber = getNextBranchNumber();
            const branchName = `branch-${nextNumber}`;

            await window.versionControl.createBranch(branchName);
            setShowBranchSelector(false);
            await loadCurrentBranch();
            await loadBranches();
        } catch (error) {
            console.error('Failed to create branch:', error);
            alert('Failed to create branch. Please try again.');
        }
    };

    const handleBranchDelete = async (branchName: string) => {
        if (!editor || !currentFilePath || branchName === 'main') return;
        
        try {
            if (branchName === currentBranch) {
                await handleBranchSwitch('main');
            }
            
            await window.versionControl.deleteBranch(branchName);
            await loadBranches();
        } catch (error) {
            console.error('Failed to delete branch:', error);
            alert('Failed to delete branch. Please try again.');
        }
    };

    const handleBranchRename = async (oldName: string, newName: string) => {
        if (!editor || !currentFilePath || oldName === 'main') return;
        
        try {
            await window.versionControl.createBranch(newName);
            await window.versionControl.switchBranch(newName);
            const content = await window.versionControl.loadDocument(oldName);
            editor.commands.setContent(content);
            await window.versionControl.saveDocument(editor.getJSON());
            await loadBranches();
            await loadCurrentBranch();
        } catch (error) {
            console.error('Failed to rename branch:', error);
            alert('Failed to rename branch. Please try again.');
        }
    };

    useEffect(() => {
        if (currentFilePath) {
            loadCurrentBranch();
            loadBranches();
        }
    }, [currentFilePath]);

    return {
        currentBranch,
        branches,
        showBranchSelector,
        setShowBranchSelector,
        handleBranchSwitch,
        handleCreateBranch,
        handleBranchDelete,
        handleBranchRename,
    };
}; 