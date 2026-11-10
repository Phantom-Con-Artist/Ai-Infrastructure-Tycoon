import { contextBridge } from 'electron'
contextBridge.exposeInMainWorld('tycoon', { platform: process.platform })
