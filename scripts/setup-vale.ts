import fs from 'fs';
import path from 'path';
import https from 'https';
import { Extract } from 'unzipper';
import tar from 'tar';

const VALE_VERSION = '3.0.7';
const VALE_RELEASES = 'https://github.com/errata-ai/vale/releases/download';

interface PlatformInfo {
    os: string;
    arch: string;
    ext: string;
    valePath: string;
    downloadName: string;
}

function getPlatformInfo(): PlatformInfo {
    const platform = process.platform;
    const arch = process.arch;
    
    const platformMap: { [key: string]: string } = {
        'darwin': 'macOS',
        'win32': 'Windows',
        'linux': 'Linux'
    };
    
    const archMap: { [key: string]: string } = {
        'x64': '64-bit',
        'arm64': 'arm64'
    };

    const os = platformMap[platform] || platform;
    const mappedArch = archMap[arch] || arch;
    const ext = platform === 'win32' ? 'zip' : 'tar.gz';
    
    // Directory structure for Vale binary
    const osDir = platform === 'darwin' ? 'darwin' : platform === 'win32' ? 'win32' : 'linux';
    const archDir = arch;
    const binaryName = platform === 'win32' ? 'vale.exe' : 'vale';
    
    return {
        os,
        arch: mappedArch,
        ext,
        valePath: path.join('vale', 'bin', osDir, archDir),
        downloadName: `vale_${VALE_VERSION}_${os}_${mappedArch}.${ext}`
    };
}

async function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

async function extractArchive(archivePath: string, destPath: string, ext: string): Promise<void> {
    if (ext === 'zip') {
        return new Promise((resolve, reject) => {
            fs.createReadStream(archivePath)
                .pipe(Extract({ path: destPath }))
                .on('close', resolve)
                .on('error', reject);
        });
    } else {
        await tar.x({
            file: archivePath,
            cwd: destPath
        });
    }
}

async function setupVale() {
    try {
        const platform = getPlatformInfo();
        console.log('Setting up Vale for:', platform.os, platform.arch);

        // Create directories
        fs.mkdirSync(platform.valePath, { recursive: true });

        // Download URL
        const downloadUrl = `${VALE_RELEASES}/v${VALE_VERSION}/${platform.downloadName}`;
        const downloadPath = path.join('.tmp', platform.downloadName);

        // Ensure .tmp directory exists
        fs.mkdirSync('.tmp', { recursive: true });

        console.log('Downloading Vale from:', downloadUrl);
        await downloadFile(downloadUrl, downloadPath);

        console.log('Extracting Vale...');
        await extractArchive(downloadPath, platform.valePath, platform.ext);

        // Set executable permissions on Unix-like systems
        if (process.platform !== 'win32') {
            const valeBinaryPath = path.join(platform.valePath, 'vale');
            fs.chmodSync(valeBinaryPath, '755');
        }

        // Clean up
        fs.unlinkSync(downloadPath);

        console.log('Vale setup complete!');
        console.log('Binary location:', path.join(platform.valePath, platform.os === 'Windows' ? 'vale.exe' : 'vale'));
    } catch (error) {
        console.error('Error setting up Vale:', error);
        process.exit(1);
    }
}

setupVale(); 