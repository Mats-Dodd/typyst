import React, { useEffect } from 'react';
import { BiRename, BiTrash } from 'react-icons/bi';
import type { BranchContextMenuProps } from '../../../types/menubar';
import styles from '../../../../../styles/menubar/BranchControls.module.css';

export const BranchContextMenu: React.FC<BranchContextMenuProps> = ({
    contextMenu,
    currentBranch,
    onDelete,
    onRename,
    onClose,
}) => {
    useEffect(() => {
        const handleClickOutside = () => onClose();
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    const isDeleteDisabled = contextMenu.branch === 'main';

    return (
        <div
            className={styles['branch-context-menu']}
            style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                className={styles['branch-menu-option']}
                onClick={() => onRename(contextMenu.branch)}
                disabled={contextMenu.branch === 'main'}
            >
                <BiRename />
                Rename Branch
            </button>
            <button
                className={styles['branch-menu-option']}
                onClick={() => onDelete(contextMenu.branch)}
                disabled={isDeleteDisabled}
                title={isDeleteDisabled ? "Cannot delete main branch" : ""}
            >
                <BiTrash />
                Delete Branch
            </button>
        </div>
    );
}; 