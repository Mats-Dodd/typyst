import React from 'react';

interface BranchContextMenuProps {
    contextMenu: {
        branch: string;
        x: number;
        y: number;
    };
    currentBranch: string;
    onDelete: (branch: string) => void;
    onRename: (branch: string) => void;
    onClose: () => void;
}

export const BranchContextMenu: React.FC<BranchContextMenuProps> = ({
    contextMenu,
    currentBranch,
    onDelete,
    onRename,
    onClose
}) => {
    const handleRename = () => {
        console.log('Rename clicked for branch:', contextMenu.branch);
        onRename(contextMenu.branch);
        onClose();
    };

    return (
        <div 
            className="branch-context-menu"
            style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 1000
            }}
        >
            <div className="menu-item" onClick={handleRename}>
                Rename branch
            </div>
            <div className="menu-item delete" onClick={() => onDelete(contextMenu.branch)}>
                Delete branch
            </div>
        </div>
    );
}; 