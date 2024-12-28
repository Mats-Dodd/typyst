import type { DocumentIndex, BranchMetadata } from '../types';

/**
 * Creates and initializes a .typyst directory for version control
 * @param documentPath The path to the document being versioned
 * @param initialContent The ProseMirror JSON content of the document
 */
export async function initializeVersionControl(documentPath: string, initialContent: any): Promise<void> {
    const documentDir = await window.path.dirname(documentPath);
    const typystDir = await window.path.join(documentDir, '.typyst');
    const versionsDir = await window.path.join(typystDir, 'versions');
    const mainBranchDir = await window.path.join(versionsDir, 'main');
    const tempDir = await window.path.join(typystDir, 'temp');

    // Create directory structure
    await window.fs.createDir(typystDir);
    await window.fs.createDir(versionsDir);
    await window.fs.createDir(mainBranchDir);
    await window.fs.createDir(await window.path.join(mainBranchDir, 'history'));
    await window.fs.createDir(await window.path.join(versionsDir, 'branches'));
    await window.fs.createDir(tempDir);

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
                head: ''  // Will be set after first save
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