import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { Registry, DocumentEntry, VersionControlConfig, VersionState } from '../../types/versioning';

export class VersionControlStorage {
  private config: VersionControlConfig;
  private registry: Registry = { documents: {} };
  private registryPath: string;

  constructor() {
    // Get the app's root directory
    const appRoot = process.env.APP_ROOT || app.getAppPath();
    console.log('Storage: App root path:', appRoot);

    // Set up paths
    const rootDir = path.join(appRoot, '.typyst');
    console.log('Storage: Root directory path:', rootDir);

    this.config = {
      rootDir,
      documentsDir: path.join(rootDir, 'documents')
    };
    console.log('Storage: Documents directory path:', this.config.documentsDir);
    
    this.registryPath = path.join(rootDir, 'registry.json');
    console.log('Storage: Registry file path:', this.registryPath);
  }

  async initialize(): Promise<void> {
    console.log('Storage: Starting initialization...');
    await this.ensureDirectoryStructure();
    await this.loadRegistry();
    console.log('Storage: Initialization complete');
  }

  private async ensureDirectoryStructure(): Promise<void> {
    console.log('Storage: Creating root directory:', this.config.rootDir);
    try {
      await fs.access(this.config.rootDir).catch(async () => {
        console.log('Storage: Root directory does not exist, creating it');
        await fs.mkdir(this.config.rootDir, { recursive: true });
      });
      console.log('Storage: Root directory exists or was created successfully');
    } catch (error) {
      console.error('Storage: Error creating root directory:', error);
      throw error;
    }

    console.log('Storage: Creating documents directory:', this.config.documentsDir);
    try {
      await fs.access(this.config.documentsDir).catch(async () => {
        console.log('Storage: Documents directory does not exist, creating it');
        await fs.mkdir(this.config.documentsDir, { recursive: true });
      });
      console.log('Storage: Documents directory exists or was created successfully');
    } catch (error) {
      console.error('Storage: Error creating documents directory:', error);
      throw error;
    }
  }

  private async loadRegistry(): Promise<void> {
    console.log('Storage: Loading registry from:', this.registryPath);
    try {
      await fs.access(this.registryPath);
      const data = await fs.readFile(this.registryPath, 'utf-8');
      this.registry = JSON.parse(data);
      console.log('Storage: Registry loaded successfully');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('Storage: Registry file does not exist, creating new registry');
        this.registry = { documents: {} };
        await this.saveRegistry();
      } else {
        console.error('Storage: Error loading registry:', error);
        throw error;
      }
    }
  }

  private async saveRegistry(): Promise<void> {
    console.log('Storage: Saving registry to:', this.registryPath);
    try {
      await fs.writeFile(this.registryPath, JSON.stringify(this.registry, null, 2));
      console.log('Storage: Registry saved successfully');
    } catch (error) {
      console.error('Storage: Error saving registry:', error);
      throw error;
    }
  }

  async createDocument(filePath: string): Promise<DocumentEntry> {
    console.log('Storage: Creating document for:', filePath);
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const entry: DocumentEntry = {
      id,
      path: filePath,
      created: now,
      lastModified: now,
      currentBranch: 'main',
      branches: {
        main: {
          lastModified: now,
          head: ''
        }
      }
    };

    // Create document directory structure
    const docDir = path.join(this.config.documentsDir, id);
    console.log('Storage: Creating document directory:', docDir);
    await fs.mkdir(docDir, { recursive: true });
    await fs.mkdir(path.join(docDir, 'versions', 'main'), { recursive: true });
    await fs.mkdir(path.join(docDir, 'versions', 'branches'), { recursive: true });

    // Add to registry
    this.registry.documents[id] = entry;
    await this.saveRegistry();
    console.log('Storage: Document created successfully:', id);

    return entry;
  }

  async getDocument(id: string): Promise<DocumentEntry | null> {
    return this.registry.documents[id] || null;
  }

  async getDocumentByPath(filePath: string): Promise<DocumentEntry | null> {
    return Object.values(this.registry.documents).find(doc => doc.path === filePath) || null;
  }

  async updateDocument(id: string, updates: Partial<DocumentEntry>): Promise<DocumentEntry> {
    const doc = this.registry.documents[id];
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }

    const updated = {
      ...doc,
      ...updates,
      lastModified: Date.now()
    };

    this.registry.documents[id] = updated;
    await this.saveRegistry();

    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    const docDir = path.join(this.config.documentsDir, id);
    await fs.rm(docDir, { recursive: true, force: true });
    delete this.registry.documents[id];
    await this.saveRegistry();
  }

  getConfig(): VersionControlConfig {
    return this.config;
  }

  private getDocumentDir(id: string): string {
    return path.join(this.config.documentsDir, id);
  }

  private getVersionPath(id: string, branch: string, versionId: string): string {
    return path.join(this.getDocumentDir(id), 'versions', branch, `${versionId}.json`);
  }

  async saveVersion(id: string, content: any): Promise<string> {
    const doc = await this.getDocument(id);
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }

    const versionId = crypto.randomUUID();
    const branch = doc.currentBranch;
    const branchInfo = doc.branches[branch];
    if (!branchInfo) {
      throw new Error(`Branch ${branch} not found`);
    }

    const version: VersionState = {
      content,
      timestamp: Date.now(),
      branch,
      parent: branchInfo.head || undefined
    };

    // Save version content
    const versionPath = this.getVersionPath(id, branch, versionId);
    await fs.mkdir(path.dirname(versionPath), { recursive: true });
    await fs.writeFile(versionPath, JSON.stringify(version, null, 2));

    // Update branch head
    await this.updateDocument(id, {
      branches: {
        ...doc.branches,
        [branch]: {
          lastModified: Date.now(),
          head: versionId
        }
      }
    });

    return versionId;
  }

  async getVersion(id: string, versionId: string): Promise<VersionState | null> {
    const doc = await this.getDocument(id);
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }

    // Find the branch containing this version
    let branch = doc.currentBranch;
    for (const [branchName, branchInfo] of Object.entries(doc.branches)) {
      if (branchInfo.head === versionId) {
        branch = branchName;
        break;
      }
    }

    try {
      const versionPath = this.getVersionPath(id, branch, versionId);
      const content = await fs.readFile(versionPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading version ${versionId}:`, error);
      return null;
    }
  }

  async createBranch(id: string, branchName: string): Promise<void> {
    const doc = await this.getDocument(id);
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }

    if (doc.branches[branchName]) {
      throw new Error(`Branch ${branchName} already exists`);
    }

    const currentBranch = doc.branches[doc.currentBranch];
    if (!currentBranch) {
      throw new Error(`Current branch ${doc.currentBranch} not found`);
    }

    // Create branch directory
    const branchDir = path.join(this.getDocumentDir(id), 'versions', branchName);
    await fs.mkdir(branchDir, { recursive: true });

    // Update document with new branch
    await this.updateDocument(id, {
      branches: {
        ...doc.branches,
        [branchName]: {
          lastModified: Date.now(),
          head: currentBranch.head // Start with the same head as current branch
        }
      }
    });
  }

  async switchBranch(id: string, branchName: string): Promise<void> {
    const doc = await this.getDocument(id);
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }

    if (!doc.branches[branchName]) {
      throw new Error(`Branch ${branchName} not found`);
    }

    await this.updateDocument(id, {
      currentBranch: branchName
    });
  }

  async getCurrentVersion(id: string): Promise<VersionState | null> {
    const doc = await this.getDocument(id);
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }

    const currentBranch = doc.branches[doc.currentBranch];
    if (!currentBranch || !currentBranch.head) {
      return null;
    }

    return this.getVersion(id, currentBranch.head);
  }

  async getVersionHistory(id: string, branch?: string): Promise<VersionState[]> {
    const doc = await this.getDocument(id);
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }

    const targetBranch = branch || doc.currentBranch;
    const branchInfo = doc.branches[targetBranch];
    if (!branchInfo) {
      throw new Error(`Branch ${targetBranch} not found`);
    }

    const history: VersionState[] = [];
    let currentVersionId = branchInfo.head;

    while (currentVersionId) {
      const version = await this.getVersion(id, currentVersionId);
      if (!version) break;

      history.push(version);
      currentVersionId = version.parent || '';
    }

    return history;
  }
} 