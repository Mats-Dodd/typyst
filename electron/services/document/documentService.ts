import fs from 'fs-extra';
import path from 'path';
import git from 'isomorphic-git';
import { v4 as uuidv4 } from 'uuid';
import { gitService } from '../git/gitService';

interface TypestConfig {
  documentId: string;
  originalPath: string;
  pathHistory: string[];
  currentPath: string;
  lastUpdated: string;
}

export interface DocumentService {
  initializeDocument(originalPath: string): Promise<void>;
  saveDocument(content: any): Promise<void>;
  loadDocument(branchName: string): Promise<any>;
  syncWithOriginal(): Promise<void>;
  updateDocumentPath(newPath: string): Promise<void>;
}

interface DocumentContent {
  type: 'doc';
  content: any;
  metadata?: {
    lastModified: string;
    format: 'prosemirror';
  };
}

class DocumentServiceImpl implements DocumentService {
  private currentDocPath: string | null = null;

  private async getConfigPath(): Promise<string> {
    if (!this.currentDocPath) {
      throw new Error('No document initialized');
    }
    const typystDir = path.join(path.dirname(this.currentDocPath), '.typyst');
    return path.join(typystDir, '.typyst-config.json');
  }

  private async loadConfig(): Promise<TypestConfig> {
    const configPath = await this.getConfigPath();
    try {
      const config = await fs.readJSON(configPath);
      // Handle existing configs without new fields
      if (!config.documentId) {
        config.documentId = uuidv4();
        config.pathHistory = [this.currentDocPath!];
        config.currentPath = this.currentDocPath!;
        config.originalPath = this.currentDocPath!;
        config.lastUpdated = new Date().toISOString();
        await fs.writeJSON(configPath, config);
      }
      return config;
    } catch (error) {
      // Create new config if it doesn't exist
      const newConfig: TypestConfig = {
        documentId: uuidv4(),
        originalPath: this.currentDocPath!,
        pathHistory: [this.currentDocPath!],
        currentPath: this.currentDocPath!,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeJSON(configPath, newConfig);
      return newConfig;
    }
  }

  private async updateConfig(updates: Partial<TypestConfig>): Promise<void> {
    const config = await this.loadConfig();
    const updatedConfig = { ...config, ...updates };
    const configPath = await this.getConfigPath();
    await fs.writeJSON(configPath, updatedConfig);
  }

  async initializeDocument(originalPath: string): Promise<void> {
    console.log('Initializing document:', originalPath);
    this.currentDocPath = originalPath;
    const typystDir = path.join(path.dirname(originalPath), '.typyst');
    const gitDir = path.join(typystDir, '.git');

    try {
      // First try to set the repository path if it exists
      if (await fs.pathExists(gitDir)) {
        console.log('Repository already exists, trying to set repository path');
        try {
          await gitService.setRepositoryPath(originalPath);
          console.log('Successfully set repository path, ensuring we are on main branch');
          
          // Load or create config
          await this.loadConfig();
          
          // Get current branch before switch for diagnosis
          const beforeBranch = await gitService.getCurrentBranch();
          console.log('Current branch before switch:', beforeBranch);
          
          await gitService.switchBranch('main');
          
          // Verify we're actually on main and load its content
          const afterBranch = await gitService.getCurrentBranch();
          console.log('Current branch after switch:', afterBranch);
          
          if (afterBranch !== 'main') {
            throw new Error(`Failed to switch to main branch, currently on: ${afterBranch}`);
          }

          // Explicitly load content from main branch
          const contentPath = path.join(typystDir, 'content.json');
          const content = await fs.readJSON(contentPath);
          console.log('Content loaded from main branch:', content ? 'success' : 'empty');

          // Verify the content structure
          if (!content || !content.content) {
            console.error('Invalid or empty content structure on main branch');
            throw new Error('Invalid content structure on main branch');
          }

          return;
        } catch (error) {
          console.error('Error setting repository path or switching to main:', error);
          // If setting repository path fails, we'll proceed with full initialization
        }
      }

      // If we get here, we need to initialize a new repository
      console.log('No existing repository found or failed to set path, proceeding with initialization');
      await gitService.initRepository(originalPath);

      // Initialize config with new document ID
      const config: TypestConfig = {
        documentId: uuidv4(),
        originalPath: originalPath,
        pathHistory: [originalPath],
        currentPath: originalPath,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeJSON(path.join(typystDir, '.typyst-config.json'), config);

      // Copy original content to .typyst directory
      console.log('Reading original content from:', originalPath);
      const originalContent = await fs.readFile(originalPath, 'utf-8');
      
      // Save as initial content in ProseMirror format
      const initialContent: DocumentContent = {
        type: 'doc',
        content: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: originalContent
            }]
          }]
        },
        metadata: {
          lastModified: new Date().toISOString(),
          format: 'prosemirror'
        }
      };

      console.log('Writing initial content to .typyst directory');
      const contentPath = path.join(typystDir, 'content.json');
      await fs.writeJSON(contentPath, initialContent);

      // Stage and commit the content file
      console.log('Staging content file');
      await git.add({
        fs,
        dir: typystDir,
        filepath: 'content.json'
      });

      // Create initial commit with content
      console.log('Creating initial commit with content on main branch');
      await gitService.commitChanges(initialContent);

      // Verify content was saved and we're on main
      const savedContent = await fs.readJSON(contentPath);
      if (!savedContent || !savedContent.content) {
        throw new Error('Failed to verify initial content was saved');
      }

      const finalBranch = await gitService.getCurrentBranch();
      console.log('Final branch after initialization:', finalBranch);
      if (finalBranch !== 'main') {
        throw new Error(`Repository initialized on wrong branch: ${finalBranch}`);
      }
      
      console.log('Document initialization complete on main branch');
    } catch (error) {
      console.error('Error initializing document:', error);
      throw error;
    }
  }

  async saveDocument(content: any): Promise<void> {
    if (!this.currentDocPath) {
      throw new Error('No document initialized');
    }

    try {
      const currentBranch = await gitService.getCurrentBranch();
      console.log('Saving document on branch:', currentBranch);

      // Load current config
      const config = await this.loadConfig();
      
      // Update path history if current path has changed
      if (config.currentPath !== this.currentDocPath) {
        config.pathHistory.push(this.currentDocPath);
        config.currentPath = this.currentDocPath;
        config.lastUpdated = new Date().toISOString();
        await this.updateConfig(config);
      }

      // Wrap the content in our document format
      const documentContent: DocumentContent = {
        type: 'doc',
        content: content,
        metadata: {
          lastModified: new Date().toISOString(),
          format: 'prosemirror'
        }
      };

      const typystDir = path.join(path.dirname(this.currentDocPath), '.typyst');
      const contentPath = path.join(typystDir, 'content.json');

      // Write content to file
      console.log('Writing content to file');
      await fs.writeJSON(contentPath, documentContent);

      // Save to git repository
      console.log('Committing changes to git repository');
      await gitService.commitChanges(documentContent);

      // Only sync with original file if we're on the main branch
      if (currentBranch === 'main') {
        console.log('On main branch, syncing with original file');
        await this.syncWithOriginal();
      }
      console.log('Save complete');
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  async loadDocument(branchName: string): Promise<any> {
    if (!this.currentDocPath) {
      throw new Error('No document initialized');
    }

    const typystDir = path.join(path.dirname(this.currentDocPath), '.typyst');
    console.log('Loading document from branch:', branchName);
    
    try {
      // Switch to the requested branch
      console.log('Switching to branch:', branchName);
      await gitService.switchBranch(branchName);

      // Read content from the requested branch
      console.log('Reading content from branch:', branchName);
      const content = await fs.readJSON(path.join(typystDir, 'content.json'));
      console.log('Content loaded:', content ? 'success' : 'empty');

      // Return just the editor content part
      if (content && content.type === 'doc' && content.metadata?.format === 'prosemirror') {
        console.log('Returning prosemirror content');
        return content.content;
      }

      console.log('No valid content found, returning default structure');
      // If the content is in the old format or invalid, return a default structure
      return {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: []
        }]
      };
    } catch (error) {
      console.error('Error loading document:', error);
      throw error;
    }
  }

  async syncWithOriginal(): Promise<void> {
    if (!this.currentDocPath) {
      throw new Error('No document initialized');
    }

    console.log('Syncing with original file:', this.currentDocPath);
    const typystDir = path.join(path.dirname(this.currentDocPath), '.typyst');
    const content = await fs.readJSON(path.join(typystDir, 'content.json'));

    // Extract the actual content from our document format
    const editorContent = content.content;
    console.log('Extracted editor content');

    // Convert ProseMirror JSON to markdown or appropriate format
    let textContent = '';
    if (editorContent && editorContent.content) {
      textContent = this.extractTextContent(editorContent);
      console.log('Converted to text content, length:', textContent.length);
    }

    // Write back to original file
    console.log('Writing to original file');
    await fs.writeFile(this.currentDocPath, textContent, 'utf-8');
    console.log('Sync complete');
  }

  private extractTextContent(node: any): string {
    if (!node) return '';

    if (node.text) {
      return node.text;
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map((child: any) => this.extractTextContent(child)).join('\n');
    }

    return '';
  }

  async updateDocumentPath(newPath: string): Promise<void> {
    if (!this.currentDocPath) {
      throw new Error('No document initialized');
    }

    try {
      console.log('Updating document path from:', this.currentDocPath, 'to:', newPath);
      
      // Load current config
      const config = await this.loadConfig();
      
      // Update path history
      if (!config.pathHistory.includes(newPath)) {
        config.pathHistory.push(newPath);
      }
      
      // Update current path
      config.currentPath = newPath;
      config.lastUpdated = new Date().toISOString();
      
      // Save config changes
      await this.updateConfig(config);
      
      // Update current path
      this.currentDocPath = newPath;
      
      console.log('Document path updated successfully');
    } catch (error) {
      console.error('Error updating document path:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentServiceImpl(); 