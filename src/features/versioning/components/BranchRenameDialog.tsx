import React, { useState } from 'react';

interface BranchRenameDialogProps {
    branch: string;
    onRename: (oldName: string, newName: string) => void;
    onClose: () => void;
}

export const BranchRenameDialog: React.FC<BranchRenameDialogProps> = ({
    branch,
    onRename,
    onClose
}) => {
    const [newName, setNewName] = useState(branch);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName && newName !== branch) {
            onRename(branch, newName);
        }
        onClose();
    };

    return (
        <div className="branch-rename-dialog-overlay">
            <div className="branch-rename-dialog">
                <h3>Rename Branch</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter new branch name"
                        autoFocus
                    />
                    <div className="dialog-actions">
                        <button type="button" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" disabled={!newName || newName === branch}>
                            Rename
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 