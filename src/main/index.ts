import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import Database from 'better-sqlite3'

let db: Database.Database
function openDb(): void {
  db = new Database(join(app.getPath('userData'), 'saves.sqlite3'))
  db.pragma('journal_mode = WAL')
  db.exec(`CREATE TABLE IF NOT EXISTS saves (
    slot TEXT PRIMARY KEY, company TEXT NOT NULL, tick INTEGER NOT NULL, cash REAL NOT NULL,
    saved_at INTEGER NOT NULL, world TEXT NOT NULL)`)
}

function registerIpc(): void {
  ipcMain.handle('save:list', () =>
    db.prepare('SELECT slot, company, tick, cash, saved_at AS savedAt FROM saves ORDER BY saved_at DESC').all())
  ipcMain.handle('save:write', (_e, slot: string, meta: { company: string; tick: number; cash: number }, world: string) => {
    db.prepare(`INSERT INTO saves (slot, company, tick, cash, saved_at, world) VALUES (?,?,?,?,?,?)
      ON CONFLICT(slot) DO UPDATE SET company=excluded.company, tick=excluded.tick, cash=excluded.cash, saved_at=excluded.saved_at, world=excluded.world`)
      .run(slot, meta.company, meta.tick, meta.cash, Date.now(), world)
    return true
  })
  ipcMain.handle('save:read', (_e, slot: string) => (db.prepare('SELECT world FROM saves WHERE slot = ?').get(slot) as { world: string } | undefined)?.world ?? null)
  ipcMain.handle('save:delete', (_e, slot: string) => { db.prepare('DELETE FROM saves WHERE slot = ?').run(slot); return true })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1680, height: 960, minWidth: 1180, minHeight: 700, backgroundColor: '#14120f', title: 'AI Infrastructure Tycoon',
    autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: false }
  })
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => { openDb(); registerIpc(); createWindow() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
