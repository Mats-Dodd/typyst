import React, { useState } from 'react';
import { BiGitBranch, BiChevronDown, BiDotsHorizontalRounded, BiCrown } from 'react-icons/bi';
import { FaPlus } from 'react-icons/fa';
import { BranchContextMenu } from './BranchContextMenu';
import { BranchRenameDialog } from './BranchRenameDialog';
import { useBranchOperations } from '../hooks/useBranchOperations';
import type { BranchControlsProps } from '../types';
import '../../../styles/BranchControls.css';

export const BranchControls: React.FC<BranchControlsProps> = ({ editor, currentFilePath }) => {
    const {
        currentBranch,
        branches,
        showBranchSelector,
        setShowBranchSelector,
        handleBranchSwitch,
        handleCreateBranch,
        handleBranchDelete,
        handleBranchRename,
    } = useBranchOperations(editor, currentFilePath);

    const [contextMenu, setContextMenu] = useState<{ branch: string; x: number; y: number } | null>(null);
    const [isRenamingBranch, setIsRenamingBranch] = useState<string | null>(null);
    const [editedFileName, setEditedFileName] = useState<string>('');

    React.useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isContextMenuClick = target.closest('.branch-context-menu');
            const isMenuTriggerClick = target.closest('.branch-menu-trigger');
            const isBranchDisplayClick = target.closest('.branch-display');
            const isBranchDropdownClick = target.closest('.branch-dropdown');
            const isRenameInputClick = target.closest('.branch-rename-input');

            // Don't close anything if clicking within the context menu or its trigger
            if (isContextMenuClick || isMenuTriggerClick) {
                return;
            }

            // Don't close anything if clicking within the branch selector or its trigger
            if (isBranchDisplayClick || isBranchDropdownClick) {
                return;
            }

            // Reset rename state if clicking outside the rename input
            if (!isRenameInputClick) {
                setIsRenamingBranch(null);
                setEditedFileName('');
            }

            // Close both menus if clicking outside
            setContextMenu(null);
            setShowBranchSelector(false);
        };

        document.addEventListener('mousedown', handleGlobalClick);
        return () => document.removeEventListener('mousedown', handleGlobalClick);
    }, [setShowBranchSelector]);

    const handleContextMenu = (e: React.MouseEvent, branch: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ branch, x: e.clientX, y: e.clientY });
    };

    if (!currentFilePath || !currentBranch) return null;

    return (
        <div className="branch-control">
            <div 
                className={`branch-display ${showBranchSelector ? 'active' : ''}`}
                onClick={() => setShowBranchSelector(!showBranchSelector)}
                title="Click to switch branches"
            >
                <BiGitBranch className="branch-icon" />
                <span className="branch-name">{currentBranch}</span>
                <BiChevronDown className="branch-caret" />
            </div>
            
            {currentBranch !== 'main' && (
                <button
                    className="branch-menu-trigger"
                    onClick={(e) => handleContextMenu(e, currentBranch)}
                >
                    <BiDotsHorizontalRounded />
                </button>
            )}

            {showBranchSelector && (
                <div className="branch-dropdown">
                    {branches.includes('main') && (
                        <div
                            key="main"
                            className={`branch-item main-branch ${currentBranch === 'main' ? 'active' : ''}`}
                            onClick={() => handleBranchSwitch('main')}
                        >
                            <BiCrown className="crown-icon" />
                            <span>main</span>
                        </div>
                    )}
                    
                    <div className="branch-dropdown-header">
                        <BiGitBranch />
                        <span>Branches</span>
                    </div>
                    
                    <div className="branch-list">
                        {branches
                            .filter(branch => branch !== 'main')
                            .map(branch => {
                                return (
                                    <div
                                        key={branch}
                                        className={`branch-item ${branch === currentBranch ? 'active' : ''} ${isRenamingBranch === branch ? 'renaming' : ''}`}
                                        onClick={() => !isRenamingBranch && handleBranchSwitch(branch)}
                                    >
                                        {isRenamingBranch === branch ? (
                                            <input
                                                className="branch-rename-input"
                                                value={editedFileName}
                                                onChange={(e) => setEditedFileName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleBranchRename(branch, editedFileName);
                                                        setIsRenamingBranch(null);
                                                    } else if (e.key === 'Escape') {
                                                        setIsRenamingBranch(null);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (editedFileName && editedFileName !== branch) {
                                                        handleBranchRename(branch, editedFileName);
                                                    }
                                                    setIsRenamingBranch(null);
                                                }}
                                                autoFocus
                                            />
                                        ) : (
                                            <span>{branch}</span>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                    
                    <div 
                        className="create-branch-option"
                        onClick={handleCreateBranch}
                    >
                        <FaPlus />
                        Create new branch
                    </div>
                </div>
            )}

            {contextMenu && (
                <BranchContextMenu
                    contextMenu={contextMenu}
                    currentBranch={currentBranch}
                    onDelete={handleBranchDelete}
                    onRename={(branch: string) => {
                        console.log('Starting rename for branch:', branch);
                        setEditedFileName(branch);
                        setIsRenamingBranch(branch);
                        setShowBranchSelector(true);
                        setContextMenu(null);
                    }}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}; 