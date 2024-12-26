import { app } from "electron";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execFileAsync = promisify(execFile);
const DEBOUNCE_DELAY = 500; // 500ms debounce

interface QueueItem {
    content: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
}

export class ValeService {
    private valeBinaryPath: string = "";
    private valeConfigPath: string = "";
    private tempFile: string;
    private isProcessing: boolean = false;
    private queue: QueueItem[] = [];
    private debounceTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.initializePaths();
        this.ensureConfigSetup();
        this.tempFile = path.join(app.getPath("temp"), "vale-temp.html");
    }

    private async ensureConfigSetup() {
        try {
            // Create styles directory in the config path if it doesn't exist
            const stylesPath = path.join(this.valeConfigPath, "styles");
            if (!fs.existsSync(stylesPath)) {
                fs.mkdirSync(stylesPath, { recursive: true });
            }

            // Copy styles from root styles directory to config/styles
            const rootStylesPath = path.join(app.getAppPath(), "styles");
            if (fs.existsSync(rootStylesPath)) {
                const styles = fs.readdirSync(rootStylesPath);
                for (const style of styles) {
                    const sourcePath = path.join(rootStylesPath, style);
                    const targetPath = path.join(stylesPath, style);
                    
                    if (fs.statSync(sourcePath).isDirectory()) {
                        // Copy directory recursively
                        fs.cpSync(sourcePath, targetPath, { recursive: true });
                    } else {
                        // Copy file
                        fs.copyFileSync(sourcePath, targetPath);
                    }
                }
            }

            console.log('Vale styles copied to:', stylesPath);
        } catch (error) {
            console.error('Error setting up Vale configuration:', error);
        }
    }

    private initializePaths() {
        const platform = process.platform;
        const arch = process.arch;
        const isProduction = app.isPackaged;
        const appRoot = app.getAppPath();
        
        let binaryName = "vale";
        if (platform === "win32") {
            binaryName = "vale.exe";
        }

        if (isProduction) {
            // In production, binaries are in the resources directory
            const resourcesPath = process.resourcesPath;
            const platformDir = platform === "darwin" ? "mac" : platform === "win32" ? "win" : "linux";
            this.valeBinaryPath = path.join(resourcesPath, "vale", "bin", platformDir, arch, binaryName);
            this.valeConfigPath = path.join(resourcesPath, "vale", "config");
        } else {
            // In development, use the binaries from the project root
            const platformDir = platform === "darwin" ? "darwin" : platform === "win32" ? "win32" : "linux";
            this.valeBinaryPath = path.join(appRoot, "vale", "bin", platformDir, arch, binaryName);
            this.valeConfigPath = path.join(appRoot, "vale", "config");
        }

        // Log paths for debugging
        console.log('App Root:', appRoot);
        console.log('Vale Binary Path:', this.valeBinaryPath);
        console.log('Vale Config Path:', this.valeConfigPath);
        
        // Verify binary exists
        if (!fs.existsSync(this.valeBinaryPath)) {
            console.error(`Vale binary not found at: ${this.valeBinaryPath}`);
            console.log('Current working directory:', process.cwd());
        }
    }

    async lintHtml(htmlContent: string): Promise<any> {
        // Clear any pending timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        return new Promise((resolve, reject) => {
            // Add new request to queue
            this.queue.push({ content: htmlContent, resolve, reject });

            // Set up debounced processing
            this.debounceTimer = setTimeout(() => {
                this.processQueue();
            }, DEBOUNCE_DELAY);
        });
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            // Get the latest request
            const latestItem = this.queue[this.queue.length - 1];
            if (!latestItem) {
                return;
            }
            
            // Clear the queue
            this.queue = [];

            // Process the latest request
            const result = await this.performLint(latestItem.content);
            latestItem.resolve(result);
        } catch (error) {
            // If there was an error, reject the latest request
            const latestItem = this.queue[this.queue.length - 1];
            if (latestItem) {
                latestItem.reject(error);
            }
        } finally {
            this.isProcessing = false;
            
            // If there are new items in the queue, process them
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 0);
            }
        }
    }

    private async performLint(htmlContent: string): Promise<any> {
        try {
            // Verify binary exists before proceeding
            if (!fs.existsSync(this.valeBinaryPath)) {
                throw new Error(`Vale binary not found at: ${this.valeBinaryPath}`);
            }

            // Write content to temp file
            await fs.promises.writeFile(this.tempFile, htmlContent);

            try {
                // Run Vale with the temporary file
                const { stdout } = await execFileAsync(this.valeBinaryPath, [
                    "--config", path.join(this.valeConfigPath, ".vale.ini"),
                    "--output", "JSON",
                    this.tempFile
                ]);

                return JSON.parse(stdout);
            } catch (error: any) {
                // If Vale found issues, it will exit with code 1, but still output valid JSON
                if (error.stdout) {
                    return JSON.parse(error.stdout);
                }
                throw error;
            }
        } catch (error) {
            console.error("Vale linting error:", error);
            throw error;
        }
    }

    async getVersion(): Promise<string> {
        try {
            if (!fs.existsSync(this.valeBinaryPath)) {
                throw new Error(`Vale binary not found at: ${this.valeBinaryPath}`);
            }
            const { stdout } = await execFileAsync(this.valeBinaryPath, ["--version"]);
            return stdout.trim();
        } catch (error) {
            console.error("Error getting Vale version:", error);
            throw error;
        }
    }
} 