import { ipcMain } from "electron";
import { ValeService } from "./valeService.js";

export function registerValeIpcHandlers() {
    const valeService = new ValeService();

    ipcMain.handle("vale:lint", async (_, htmlContent: string) => {
        try {
            return await valeService.lintHtml(htmlContent);
        } catch (error) {
            console.error("Error in vale:lint handler:", error);
            throw error;
        }
    });

    ipcMain.handle("vale:version", async () => {
        try {
            return await valeService.getVersion();
        } catch (error) {
            console.error("Error in vale:version handler:", error);
            throw error;
        }
    });
} 