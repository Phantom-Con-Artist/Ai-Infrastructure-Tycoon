import { contextBridge, ipcRenderer } from 'electron'

const api = {
  list: (): Promise<{ slot: string; company: string; tick: number; cash: number; savedAt: number }[]> => ipcRenderer.invoke('save:list'),
  write: (slot: string, meta: { company: string; tick: number; cash: number }, world: string): Promise<boolean> => ipcRenderer.invoke('save:write', slot, meta, world),
  read: (slot: string): Promise<string | null> => ipcRenderer.invoke('save:read', slot),
  remove: (slot: string): Promise<boolean> => ipcRenderer.invoke('save:delete', slot)
}
contextBridge.exposeInMainWorld('saves', api)

const winApi = {
  minimize: (): void => ipcRenderer.send('win:minimize'),
  toggleMaximize: (): void => ipcRenderer.send('win:toggleMaximize'),
  fullscreen: (): void => ipcRenderer.send('win:fullscreen'),
  close: (): void => ipcRenderer.send('win:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('win:isMaximized'),
  onState: (cb: (s: { maximized: boolean; fullscreen: boolean }) => void): (() => void) => {
    const h = (_e: unknown, s: { maximized: boolean; fullscreen: boolean }): void => cb(s)
    ipcRenderer.on('win:state', h)
    return () => ipcRenderer.removeListener('win:state', h)
  }
}
contextBridge.exposeInMainWorld('win', winApi)
export type WinApi = typeof winApi
export type SavesApi = typeof api
