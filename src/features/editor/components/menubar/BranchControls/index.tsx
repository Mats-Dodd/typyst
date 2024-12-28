import React, { useState } from 'react';
import { BiGitBranch, BiChevronDown, BiDotsHorizontalRounded, BiCrown } from 'react-icons/bi';
import { FaPlus } from 'react-icons/fa';
import { BranchContextMenu } from './BranchContextMenu';
import { BranchRenameDialog } from './BranchRenameDialog';
import { useBranchOperations } from '../../../hooks/useBranchOperations';
import type { BranchControlsProps } from '../../../types/menubar';
import styles from '../../../../../styles/menubar/BranchControls.module.css';

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
        <div className={styles['branch-control']}>
            <div 
                className={`${styles['branch-display']} ${showBranchSelector ? styles.active : ''}`}
                onClick={() => setShowBranchSelector(!showBranchSelector)}
                title="Click to switch branches"
            >
                <span className={styles['branch-name']}>{currentBranch}</span>
                <BiChevronDown className={styles['branch-caret']} />
            </div>
            
            {currentBranch !== 'main' && (
                <button
                    className={styles['branch-menu-trigger']}
                    onClick={(e) => handleContextMenu(e, currentBranch)}
                >
                    <BiDotsHorizontalRounded />
                </button>
            )}

            {showBranchSelector && (
                <div className={styles['branch-dropdown']}>
                    {branches.includes('main') && (
                        <div
                            key="main"
                            className={`${styles['branch-item']} ${styles['main-branch']} ${currentBranch === 'main' ? styles.active : ''}`}
                            onClick={() => handleBranchSwitch('main')}
                        >
                            <BiCrown className={styles['crown-icon']} />
                            <span>main</span>
                        </div>
                    )}
                    
                    <div className={styles['branch-dropdown-header']}>
                        <BiGitBranch />
                        <span>Branches</span>
                    </div>
                    
                    <div className={styles['branch-list']}>
                        {branches
                            .filter(branch => branch !== 'main')
                            .map(branch => (
                                <div
                                    key={branch}
                                    className={`${styles['branch-item']} ${branch === currentBranch ? styles.active : ''}`}
                                    onClick={() => handleBranchSwitch(branch)}
                                >
                                    <span>{branch}</span>
                                </div>
                            ))}
                    </div>
                    
                    <div 
                        className={styles['create-branch-option']}
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