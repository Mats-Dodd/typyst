import React, { useState, useEffect } from 'react';
import { FaCodeBranch, FaPlus } from 'react-icons/fa';
import styles from '../../../styles/BranchSelector.module.css';

interface BranchSelectorProps {
  onBranchSwitch: (branchName: string) => void;
  onBranchCreate: (branchName: string) => void;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  onBranchSwitch,
  onBranchCreate,
}) => {
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const sanitizeBranchName = (name: string): string => {
    // Replace spaces with dashes
    // Remove special characters except dashes and underscores
    // Convert to lowercase for consistency
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-') // Replace multiple consecutive dashes with a single dash
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing dashes
  };

  const loadBranches = async () => {
    try {
      const branchList = await window.versionControl.getBranches();
      setBranches(branchList);
      const current = await window.versionControl.getCurrentBranch();
      setCurrentBranch(current);
      setError(null);
    } catch (error) {
      console.error('Failed to load branches:', error);
      setError('Failed to load branches');
    }
  };

  const handleBranchSwitch = async (branchName: string) => {
    try {
      await onBranchSwitch(branchName);
      setCurrentBranch(branchName);
      setError(null);
    } catch (error) {
      console.error('Failed to switch branch:', error);
      setError('Failed to switch branch');
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      const sanitizedName = sanitizeBranchName(newBranchName);
      if (!sanitizedName) {
        setError('Please enter a valid branch name');
        return;
      }

      await onBranchCreate(sanitizedName);
      setIsCreating(false);
      setNewBranchName('');
      setError(null);
      await loadBranches();
    } catch (error) {
      console.error('Failed to create branch:', error);
      setError('Failed to create branch');
    }
  };

  return (
    <div className={styles.branchSelector}>
      <div className={styles.currentBranch} onClick={() => setIsCreating(false)}>
        <FaCodeBranch />
        <span>{currentBranch}</span>
      </div>

      <div className={styles.branchList}>
        {branches.map((branch) => (
          <div
            key={branch}
            className={`${styles.branchItem} ${branch === currentBranch ? styles.active : ''}`}
            onClick={() => handleBranchSwitch(branch)}
          >
            {branch}
          </div>
        ))}
        
        <div className={styles.createBranch} onClick={() => setIsCreating(true)}>
          <FaPlus />
          <span>New Branch</span>
        </div>

        {isCreating && (
          <div className={styles.createBranchForm}>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => {
                setNewBranchName(e.target.value);
                setError(null);
              }}
              placeholder="Branch name"
              autoFocus
            />
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.preview}>
              Will create: {newBranchName ? sanitizeBranchName(newBranchName) : ''}
            </div>
            <button onClick={handleCreateBranch}>Create</button>
          </div>
        )}
      </div>
    </div>
  );
}; 