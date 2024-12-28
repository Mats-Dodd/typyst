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
                            .map(branch => (
                                <div
                                    key={branch}
                                    className={`branch-item ${branch === currentBranch ? 'active' : ''}`}
                                    onClick={() => handleBranchSwitch(branch)}
                                >
                                    <span>{branch}</span>
                                </div>
                            ))}
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
                        setIsRenamingBranch(branch);
                        setContextMenu(null);
                    }}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {isRenamingBranch && (
                <BranchRenameDialog
                    branch={isRenamingBranch}
                    onRename={handleBranchRename}
                    onClose={() => setIsRenamingBranch(null)}
                />
            )}
        </div>
    );
}; 