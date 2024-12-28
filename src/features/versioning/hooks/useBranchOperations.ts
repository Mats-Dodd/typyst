import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { 
    getVersionMetadata, 
    createBranch, 
    switchBranch,
    getBranchContent,
    saveBranchContent,
    deleteBranch, 
    renameBranch,
    initializeVersionControl
} from '../services/versionControlService';

export const useBranchOperations = (editor: Editor | null, currentFilePath?: string) => {
    const [currentBranch, setCurrentBranch] = useState<string>('main');
    const [branches, setBranches] = useState<string[]>(['main']);
    const [showBranchSelector, setShowBranchSelector] = useState(false);

    const loadBranches = async () => {
        if (!currentFilePath || !editor) return;
        try {
            const metadata = await getVersionMetadata(currentFilePath);
            if (metadata) {
                setBranches(Object.keys(metadata.branches));
                setCurrentBranch(metadata.currentBranch);

                // Load content for current branch
                const content = await getBranchContent(currentFilePath, metadata.currentBranch);
                if (content) {
                    editor.commands.setContent(content);
                } else {
                    // If no content exists, initialize version control with current content
                    const currentContent = editor.getJSON();
                    await initializeVersionControl(currentFilePath, currentContent);
                }
            } else {
                // Initialize version control if it doesn't exist
                const currentContent = editor.getJSON();
                await initializeVersionControl(currentFilePath, currentContent);
            }
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    };

    const getNextBranchNumber = (): number => {
        const branchNumbers = branches
            .map(branch => {
                const match = branch.match(/^branch-(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(num => num > 0);

        return branchNumbers.length === 0 ? 1 : Math.max(...branchNumbers) + 1;
    };

    const handleBranchSwitch = async (branchName: string) => {
        if (!editor || !currentFilePath) return;

        try {
            // Save current content before switching
            const currentContent = editor.getJSON();
            await saveBranchContent(currentFilePath, currentBranch, currentContent);

            const success = await switchBranch(currentFilePath, branchName);
            if (success) {
                // Load branch content
                const content = await getBranchContent(currentFilePath, branchName);
                if (content) {
                    editor.commands.setContent(content);
                }
                
                setShowBranchSelector(false);
                setCurrentBranch(branchName);
            } else {
                throw new Error('Failed to switch branch');
            }
        } catch (error) {
            console.error('Failed to switch branch:', error);
            alert('Failed to switch branch. Please try again.');
        }
    };

    const handleCreateBranch = async () => {
        if (!editor || !currentFilePath) return;

        try {
            // Save current branch content first
            const currentContent = editor.getJSON();
            await saveBranchContent(currentFilePath, currentBranch, currentContent);

            const nextNumber = getNextBranchNumber();
            const branchName = `branch-${nextNumber}`;

            const success = await createBranch(currentFilePath, branchName, currentContent);
            if (success) {
                setShowBranchSelector(false);
                await loadBranches();
                await handleBranchSwitch(branchName);
            } else {
                throw new Error('Failed to create branch');
            }
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
            
            const success = await deleteBranch(currentFilePath, branchName);
            if (success) {
                await loadBranches();
            } else {
                throw new Error('Failed to delete branch');
            }
        } catch (error) {
            console.error('Failed to delete branch:', error);
            alert('Failed to delete branch. Please try again.');
        }
    };

    const handleBranchRename = async (oldName: string, newName: string) => {
        if (!editor || !currentFilePath || oldName === 'main') return;
        
        try {
            const success = await renameBranch(currentFilePath, oldName, newName);
            if (success) {
                await loadBranches();
            } else {
                throw new Error('Failed to rename branch');
            }
        } catch (error) {
            console.error('Failed to rename branch:', error);
            alert('Failed to rename branch. Please try again.');
        }
    };

    useEffect(() => {
        if (currentFilePath) {
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