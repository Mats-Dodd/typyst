import git from 'isomorphic-git';
import fs from 'fs-extra';
import path from 'path';

export interface GitService {
  initRepository(docPath: string): Promise<void>;
  setRepositoryPath(docPath: string): Promise<void>;
  createBranch(branchName: string): Promise<void>;
  switchBranch(branchName: string): Promise<void>;
  commitChanges(content: any): Promise<void>;
  getBranches(): Promise<string[]>;
  getCurrentBranch(): Promise<string>;
  deleteBranch(branchName: string): Promise<void>;
}

class GitServiceImpl implements GitService {
  private repoPath: string | null = null;
  private fs = fs;

  private async ensureInitialized(): Promise<void> {
    if (!this.repoPath) {
      throw new Error('Git repository not initialized');
    }
  }

  async setRepositoryPath(docPath: string): Promise<void> {
    const typystDir = path.join(path.dirname(docPath), '.typyst');
    const gitDir = path.join(typystDir, '.git');
    
    // Check if this is a valid git repository
    const isRepo = await this.fs.pathExists(gitDir);
    if (!isRepo) {
      throw new Error('No valid git repository found');
    }
    
    this.repoPath = typystDir;
    console.log('Repository path set to:', this.repoPath);
  }

  async initRepository(docPath: string): Promise<void> {
    console.log('Initializing Git repository for:', docPath);
    const typystDir = path.join(path.dirname(docPath), '.typyst');
    const gitDir = path.join(typystDir, '.git');
    
    try {
      // First try to set the repository path if it exists
      if (await this.fs.pathExists(gitDir)) {
        console.log('Repository already exists, setting path');
        await this.setRepositoryPath(docPath);
        return;
      }
      
      // If we get here, we need to initialize a new repository
      await this.fs.ensureDir(typystDir);
      
      // Initialize git repository
      console.log('Creating Git repository in:', typystDir);
      await git.init({
        fs: this.fs,
        dir: typystDir,
        defaultBranch: 'main'
      });

      this.repoPath = typystDir;
      console.log('Repository initialized at:', this.repoPath);

      // Create initial config
      const config = {
        originalPath: docPath,
        currentBranch: 'main',
        lastSaved: new Date().toISOString()
      };

      // Write and stage config file
      console.log('Writing initial config');
      await this.fs.writeJSON(path.join(typystDir, '.typyst-config.json'), config);
      await git.add({
        fs: this.fs,
        dir: typystDir,
        filepath: '.typyst-config.json'
      });

      // Create initial commit to establish main branch
      console.log('Creating initial commit');
      await git.commit({
        fs: this.fs,
        dir: typystDir,
        message: 'Initial commit',
        author: {
          name: 'Typyst',
          email: 'typyst@local'
        }
      });

      // Now verify we're on main branch
      const currentBranch = await git.currentBranch({
        fs: this.fs,
        dir: typystDir,
        fullname: false
      });

      if (currentBranch !== 'main') {
        console.error('Repository initialized on wrong branch:', currentBranch);
        throw new Error('Failed to initialize repository on main branch');
      }
      
      console.log('Repository initialization complete on main branch');
    } catch (error) {
      console.error('Error initializing repository:', error);
      throw error;
    }
  }

  async createBranch(branchName: string): Promise<void> {
    await this.ensureInitialized();
    console.log('Creating new branch:', branchName);

    try {
      // First, ensure we're on main branch
      const currentBranch = await this.getCurrentBranch();
      if (currentBranch !== 'main') {
        console.log('Switching to main before creating new branch');
        await this.switchBranch('main');
      }

      // Create and checkout the new branch
      console.log('Creating branch from main:', branchName);
      await git.branch({
        fs: this.fs,
        dir: this.repoPath!,
        ref: branchName,
        checkout: true
      });

      // Verify the branch was created and we're on it
      const newCurrentBranch = await this.getCurrentBranch();
      if (newCurrentBranch !== branchName) {
        throw new Error('Failed to create and switch to new branch');
      }

      console.log('Successfully created and switched to branch:', branchName);
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  async switchBranch(branchName: string): Promise<void> {
    await this.ensureInitialized();
    console.log('Switching to branch:', branchName);

    try {
      // Get current branch for diagnosis
      const startingBranch = await this.getCurrentBranch();
      console.log('Starting branch before switch:', startingBranch);

      // First, clean the working directory
      console.log('Cleaning working directory');
      
      // For main branch, we want to be extra careful
      if (branchName === 'main') {
        console.log('Switching to main branch, ensuring clean state');
        // Force a clean checkout of main
        await git.checkout({
          fs: this.fs,
          dir: this.repoPath!,
          ref: 'main',
          force: true
        });

        // Verify we're on main
        const currentBranch = await this.getCurrentBranch();
        if (currentBranch !== 'main') {
          console.error('Failed to switch to main branch, current branch:', currentBranch);
          throw new Error('Failed to switch to main branch');
        }
        console.log('Successfully switched to main branch');
      } else {
        // For other branches, proceed with normal checkout
        console.log(`Switching to branch: ${branchName}`);
        await git.checkout({
          fs: this.fs,
          dir: this.repoPath!,
          ref: branchName,
          force: true
        });

        // Verify the switch was successful
        const currentBranch = await this.getCurrentBranch();
        if (currentBranch !== branchName) {
          console.error('Failed to switch branches:', { 
            attempted: branchName, 
            current: currentBranch 
          });
          throw new Error(`Failed to switch to branch: ${branchName}`);
        }
        console.log(`Successfully switched to branch: ${branchName}`);
      }

      // Verify the working directory is clean
      const status = await git.statusMatrix({
        fs: this.fs,
        dir: this.repoPath!,
      });
      
      const hasChanges = status.some(([_, head, workdir, stage]) => head !== workdir || head !== stage);
      if (hasChanges) {
        console.warn('Working directory has uncommitted changes after branch switch');
      } else {
        console.log('Working directory is clean after branch switch');
      }

      console.log('Branch switch complete');
    } catch (error) {
      console.error('Error switching branches:', error);
      throw error;
    }
  }

  async commitChanges(content: any): Promise<void> {
    await this.ensureInitialized();
    const currentBranch = await this.getCurrentBranch();
    console.log('Committing changes on branch:', currentBranch);
    
    // Stage changes
    console.log('Staging changes');
    await git.add({
      fs: this.fs,
      dir: this.repoPath!,
      filepath: 'content.json'
    });

    // Create commit
    console.log('Creating commit');
    await git.commit({
      fs: this.fs,
      dir: this.repoPath!,
      message: `Manual save: ${new Date().toISOString()}`,
      author: {
        name: 'Typyst',
        email: 'typyst@local'
      }
    });
    console.log('Changes committed successfully');
  }

  async getBranches(): Promise<string[]> {
    await this.ensureInitialized();
    console.log('Getting list of branches');
    const branches = await git.listBranches({
      fs: this.fs,
      dir: this.repoPath!
    });
    console.log('Available branches:', branches);
    return branches;
  }

  async getCurrentBranch(): Promise<string> {
    await this.ensureInitialized();
    console.log('Getting current branch');
    const branch = await git.currentBranch({
      fs: this.fs,
      dir: this.repoPath!,
      fullname: false
    });
    if (!branch) {
      console.error('No current branch found');
      throw new Error('No current branch found');
    }
    console.log('Current branch:', branch);
    return branch;
  }

  async deleteBranch(branchName: string): Promise<void> {
    await this.ensureInitialized();
    console.log('Attempting to delete branch:', branchName);
    
    if (branchName === 'main') {
      console.error('Cannot delete main branch');
      throw new Error('Cannot delete main branch');
    }
    
    console.log('Deleting branch:', branchName);
    await git.deleteBranch({
      fs: this.fs,
      dir: this.repoPath!,
      ref: branchName
    });
    console.log('Branch deleted successfully:', branchName);
  }
}

export const gitService = new GitServiceImpl(); 