import type { DocumentIndex, BranchMetadata } from '../types';

/**
 * Creates and initializes a .typyst directory for version control
 * @param documentPath The path to the document
 * @param initialContent The ProseMirror JSON content of the document
 */
export async function initializeVersionControl(documentPath: string, initialContent: any): Promise<void> {
    const documentDir = await window.path.dirname(documentPath);
    const typystDir = await window.path.join(documentDir, '.typyst');
    const versionsDir = await window.path.join(typystDir, 'versions');
    const mainBranchDir = await window.path.join(versionsDir, 'main');
    const historyDir = await window.path.join(mainBranchDir, 'history');
    const tempDir = await window.path.join(typystDir, 'temp');

    // Create directory structure
    await window.fs.createDir(typystDir);
    await window.fs.createDir(versionsDir);
    await window.fs.createDir(mainBranchDir);
    await window.fs.createDir(historyDir);
    await window.fs.createDir(await window.path.join(versionsDir, 'branches'));
    await window.fs.createDir(tempDir);

    // Save initial content for main branch
    const contentPath = await window.path.join(mainBranchDir, 'content.json');
    await window.fs.writeFile(contentPath, JSON.stringify(initialContent, null, 2));

    // Create initial document index
    const documentIndex: DocumentIndex = {
        version: '1.0.0',
        documentPath: documentPath,
        initializedAt: Date.now(),
        lastModified: Date.now(),
        currentBranch: 'main',
        branches: {
            main: {
                created: Date.now(),
                lastSync: Date.now(),
                head: contentPath
            }
        }
    };

    // Create initial branch metadata
    const mainBranchMetadata: BranchMetadata = {
        name: 'main',
        parent: '',  // Main branch has no parent
        divergePoint: '',
        lastSyncWithMain: Date.now(),  // Always in sync with itself
        changesSinceSync: 0,
        status: 'ahead'  // Main is always considered ahead
    };

    // Create initial configuration
    const config = {
        version: '1.0.0',
        autosave: {
            enabled: true,
            interval: 1000
        },
        backup: {
            enabled: true,
            maxBackups: 5
        },
        merge: {
            strategy: 'auto',
            conflictResolution: 'manual'
        }
    };

    // Write initial files
    await window.fs.writeFile(
        await window.path.join(typystDir, 'index.json'),
        JSON.stringify(documentIndex, null, 2)
    );

    await window.fs.writeFile(
        await window.path.join(mainBranchDir, 'metadata.json'),
        JSON.stringify(mainBranchMetadata, null, 2)
    );

    await window.fs.writeFile(
        await window.path.join(typystDir, 'config.json'),
        JSON.stringify(config, null, 2)
    );
}

/**
 * Checks if a document is already under version control
 * @param documentPath The path to check
 */
export async function isVersionControlled(documentPath: string): Promise<boolean> {
    const documentDir = await window.path.dirname(documentPath);
    const typystDir = await window.path.join(documentDir, '.typyst');
    try {
        const result = await window.fs.exists(typystDir);
        return result.exists;
    } catch (error) {
        console.error('Error checking version control status:', error);
        return false;
    }
}

/**
 * Gets the version control metadata for a document
 * @param documentPath The path to the document
 */
export async function getVersionMetadata(documentPath: string): Promise<DocumentIndex | null> {
    const documentDir = await window.path.dirname(documentPath);
    const indexPath = await window.path.join(documentDir, '.typyst', 'index.json');
    try {
        const result = await window.fs.readFile(indexPath);
        if (result.error) return null;
        return JSON.parse(result.content);
    } catch (error) {
        console.error('Error reading version metadata:', error);
        return null;
    }
}

/**
 * Creates a new branch from the current branch
 * @param documentPath The path to the document
 * @param branchName The name of the new branch
 * @param content The current document content
 */
export async function createBranch(documentPath: string, branchName: string, content: any): Promise<boolean> {
    try {
        const metadata = await getVersionMetadata(documentPath);
        if (!metadata || !metadata.currentBranch || !metadata.branches[metadata.currentBranch]?.head) return false;

        const documentDir = await window.path.dirname(documentPath);
        const typystDir = await window.path.join(documentDir, '.typyst');
        const versionsDir = await window.path.join(typystDir, 'versions');
        const branchDir = await window.path.join(versionsDir, branchName);
        const historyDir = await window.path.join(branchDir, 'history');

        // Create branch directory structure
        await window.fs.createDir(branchDir);
        await window.fs.createDir(historyDir);

        // Save initial branch content
        const contentPath = await window.path.join(branchDir, 'content.json');
        await window.fs.writeFile(contentPath, JSON.stringify(content, null, 2));

        // Create branch metadata
        const branchMetadata: BranchMetadata = {
            name: branchName,
            parent: metadata.currentBranch,
            divergePoint: metadata.branches[metadata.currentBranch]?.head ?? '',
            lastSyncWithMain: Date.now(),
            changesSinceSync: 0,
            status: 'ahead'
        };

        // Update document index
        metadata.branches[branchName] = {
            created: Date.now(),
            lastSync: Date.now(),
            head: contentPath
        };

        // Save branch metadata
        await window.fs.writeFile(
            await window.path.join(branchDir, 'metadata.json'),
            JSON.stringify(branchMetadata, null, 2)
        );

        // Save updated document index
        await window.fs.writeFile(
            await window.path.join(typystDir, 'index.json'),
            JSON.stringify(metadata, null, 2)
        );

        return true;
    } catch (error) {
        console.error('Error creating branch:', error);
        return false;
    }
}

/**
 * Switches to a different branch and loads its content
 * @param documentPath The path to the document
 * @param branchName The name of the branch to switch to
 */
export async function switchBranch(documentPath: string, branchName: string): Promise<boolean> {
    try {
        const metadata = await getVersionMetadata(documentPath);
        if (!metadata || !metadata.branches[branchName]) return false;

        // Save current branch content before switching
        const currentContent = await getBranchContent(documentPath, metadata.currentBranch);
        if (currentContent) {
            await saveBranchContent(documentPath, metadata.currentBranch, currentContent);
        }

        // Update current branch in metadata
        metadata.currentBranch = branchName;
        metadata.lastModified = Date.now();

        // Save updated document index
        await window.fs.writeFile(
            await window.path.join(await window.path.dirname(documentPath), '.typyst', 'index.json'),
            JSON.stringify(metadata, null, 2)
        );

        return true;
    } catch (error) {
        console.error('Error switching branch:', error);
        return false;
    }
}

/**
 * Gets the content of a branch
 * @param documentPath The path to the document
 * @param branchName The name of the branch
 */
export async function getBranchContent(documentPath: string, branchName: string): Promise<any | null> {
    try {
        const documentDir = await window.path.dirname(documentPath);
        const typystDir = await window.path.join(documentDir, '.typyst');
        const versionsDir = await window.path.join(typystDir, 'versions');
        const branchDir = await window.path.join(versionsDir, branchName);
        const contentPath = await window.path.join(branchDir, 'content.json');

        // Check if content file exists
        const exists = await window.fs.exists(contentPath);
        if (!exists.exists) {
            console.warn(`Content file not found for branch ${branchName}`);
            return null;
        }

        const result = await window.fs.readFile(contentPath);
        if (result.error) {
            console.error(`Error reading content for branch ${branchName}:`, result.error);
            return null;
        }

        return JSON.parse(result.content);
    } catch (error) {
        console.error('Error reading branch content:', error);
        return null;
    }
}

/**
 * Saves content to a branch
 * @param documentPath The path to the document
 * @param branchName The name of the branch
 * @param content The content to save
 */
export async function saveBranchContent(documentPath: string, branchName: string, content: any): Promise<boolean> {
    try {
        const documentDir = await window.path.dirname(documentPath);
        const typystDir = await window.path.join(documentDir, '.typyst');
        const versionsDir = await window.path.join(typystDir, 'versions');
        const branchDir = await window.path.join(versionsDir, branchName);
        const contentPath = await window.path.join(branchDir, 'content.json');

        await window.fs.writeFile(contentPath, JSON.stringify(content, null, 2));

        // Update metadata
        const metadata = await getVersionMetadata(documentPath);
        if (metadata && metadata.branches[branchName]) {
            metadata.branches[branchName].lastSync = Date.now();
            metadata.lastModified = Date.now();

            await window.fs.writeFile(
                await window.path.join(typystDir, 'index.json'),
                JSON.stringify(metadata, null, 2)
            );
        }

        return true;
    } catch (error) {
        console.error('Error saving branch content:', error);
        return false;
    }
}

/**
 * Deletes a branch
 * @param documentPath The path to the document
 * @param branchName The name of the branch to delete
 */
export async function deleteBranch(documentPath: string, branchName: string): Promise<boolean> {
    try {
        if (branchName === 'main') return false;

        const metadata = await getVersionMetadata(documentPath);
        if (!metadata || !metadata.branches[branchName]) return false;

        const documentDir = await window.path.dirname(documentPath);
        const typystDir = await window.path.join(documentDir, '.typyst');
        const versionsDir = await window.path.join(typystDir, 'versions');
        const branchDir = await window.path.join(versionsDir, branchName);

        // Delete branch directory recursively
        await window.fs.deleteFile(branchDir);

        // Update document index
        delete metadata.branches[branchName];
        metadata.lastModified = Date.now();

        // Save updated document index
        await window.fs.writeFile(
            await window.path.join(typystDir, 'index.json'),
            JSON.stringify(metadata, null, 2)
        );

        return true;
    } catch (error) {
        console.error('Error deleting branch:', error);
        return false;
    }
}

/**
 * Renames a branch
 * @param documentPath The path to the document
 * @param oldName The current name of the branch
 * @param newName The new name for the branch
 */
export async function renameBranch(documentPath: string, oldName: string, newName: string): Promise<boolean> {
    try {
        if (oldName === 'main' || newName === 'main') return false;

        const metadata = await getVersionMetadata(documentPath);
        if (!metadata || !metadata.branches[oldName]) return false;

        const documentDir = await window.path.dirname(documentPath);
        const typystDir = await window.path.join(documentDir, '.typyst');
        const versionsDir = await window.path.join(typystDir, 'versions');
        const oldBranchDir = await window.path.join(versionsDir, oldName);
        const newBranchDir = await window.path.join(versionsDir, newName);

        // Move old branch directory to new location
        const oldContent = await window.fs.readFile(await window.path.join(oldBranchDir, 'content.json'));
        if (oldContent.error) return false;

        // Create new branch directory
        await window.fs.createDir(newBranchDir);
        await window.fs.writeFile(
            await window.path.join(newBranchDir, 'content.json'),
            oldContent.content
        );

        // Delete old branch directory
        await window.fs.deleteFile(oldBranchDir);

        // Update document index
        metadata.branches[newName] = metadata.branches[oldName];
        delete metadata.branches[oldName];
        if (metadata.currentBranch === oldName) {
            metadata.currentBranch = newName;
        }
        metadata.lastModified = Date.now();

        // Save updated document index
        await window.fs.writeFile(
            await window.path.join(typystDir, 'index.json'),
            JSON.stringify(metadata, null, 2)
        );

        return true;
    } catch (error) {
        console.error('Error renaming branch:', error);
        return false;
    }
} 