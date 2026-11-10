import { contextBridge, ipcRenderer } from 'electron'

const api = {
  list: (): Promise<{ slot: string; company: string; tick: number; cash: number; savedAt: number }[]> => ipcRenderer.invoke('save:list'),
  write: (slot: string, meta: { company: string; tick: number; cash: number }, world: string): Promise<boolean> => ipcRenderer.invoke('save:write', slot, meta, world),
  read: (slot: string): Promise<string | null> => ipcRenderer.invoke('save:read', slot),
  remove: (slot: string): Promise<boolean> => ipcRenderer.invoke('save:delete', slot)
}
contextBridge.exposeInMainWorld('saves', api)
export type SavesApi = typeof api
