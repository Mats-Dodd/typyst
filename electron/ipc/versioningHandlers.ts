// import { ipcMain } from 'electron'
// import { createBirpc } from 'birpc'
// import { VersioningRpc } from '../rpc/versioningRpc'

// export function registerVersioningHandlers() {
//     const versioningRpc = new VersioningRpc()
//     versioningRpc.initialize()

//     createBirpc(
//         versioningRpc,
//         {
//             post: (data) => {
//                 // Send to all renderer processes
//                 const windows = require('electron').BrowserWindow.getAllWindows()
//                 for (const win of windows) {
//                     win.webContents.send('versioning:to-renderer', data)
//                 }
//             },
//             on: (handler) => {
//                 ipcMain.on('versioning:from-renderer', (event, data) => {
//                     handler(data)
//                 })
//             },
//             serialize: (value) => JSON.stringify(value),
//             deserialize: (value) => JSON.parse(value)
//         }
//     )
// } 