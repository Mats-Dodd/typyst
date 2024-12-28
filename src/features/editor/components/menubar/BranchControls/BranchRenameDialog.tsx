import React, { useState } from 'react';
import styles from '../../../../../styles/menubar/BranchControls.module.css';

interface BranchRenameDialogProps {
    branch: string;
    onRename: (oldName: string, newName: string) => void;
    onClose: () => void;
}

const sanitizeBranchName = (name: string): string => {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

export const BranchRenameDialog: React.FC<BranchRenameDialogProps> = ({
    branch,
    onRename,
    onClose,
}) => {
    const [newBranchName, setNewBranchName] = useState(branch);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onRename(branch, sanitizeBranchName(newBranchName));
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className={styles['branch-rename-dialog']}>
            <div className={styles['branch-rename-form']}>
                <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="New branch name"
                    autoFocus
                    onKeyDown={handleKeyDown}
                />
            </div>
        </div>
    );
}; 