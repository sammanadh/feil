import { app, BrowserWindow } from "electron";
import chokidar from "chokidar";
import * as path from "path";
import fs, { statSync } from "node:fs";

const DOWNLOADS_DIR = process.env.HOME ? path.join(process.env.HOME, "downloads") : "~/downloads"
const TARGET_FILES = ["jpt.js"]

let win: BrowserWindow;

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 800
  })

  win.loadFile("./index.html")

  startMonitoring()
}

app.on("ready", () => {
  createWindow();
})

function startMonitoring() {
  const watcher = chokidar.watch(DOWNLOADS_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    depth: 0
  })

  watcher.on("add", filePath => {
    for (let targetFile of TARGET_FILES) {
      if (path.basename(filePath).includes(targetFile)) {
        const fn = path.basename(targetFile, path.extname(targetFile));
        const folderPath = path.join(DOWNLOADS_DIR, fn);
        createContainingFolderIfNotExists(folderPath);
        renameOlderFiles(folderPath);
        moveFileToDestination(targetFile, folderPath);
      }
    }
  })
}

function createContainingFolderIfNotExists(folderName: string) {
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName)
  }
}

function moveFileToDestination(fileName: string, destination: string) {
  const oldFilePath = path.join(DOWNLOADS_DIR, fileName);
  const newFilePath = path.join(destination, fileName);
  if (fs.existsSync(destination)) {
    fs.renameSync(oldFilePath, newFilePath);
  }
}

type FileWithBt = {
  path: string,
  bt: number
}

function renameOlderFiles(containerFolder: string) {
  const allFilesWithBt: FileWithBt[] = []
  for (let file of fs.readdirSync(containerFolder)) {
    const filePath = path.join(containerFolder, file)
    const stat = fs.statSync(filePath)
    allFilesWithBt.push({ path: filePath, bt: stat.birthtimeMs })
  }

  allFilesWithBt.sort((a, b) => {
    if (a.bt == b.bt) return 0;
    else if (a.bt < b.bt) return 1;
    else return -1;
  })

  for (let idx in allFilesWithBt) {
    const file = allFilesWithBt[idx];
    const mainName = file.path.includes("@") ? file.path.split("@")[0] : file.path;
    const newFilePath = mainName + "@" + (idx + 1);
    console.log(newFilePath)
    fs.renameSync(file.path, newFilePath)
  }
}
