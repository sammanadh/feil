import { app, BrowserWindow } from "electron";
import chokidar from "chokidar";
import * as path from "path";
import fs, { rename, statSync } from "node:fs";
import { extname } from "node:path";

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
  dirname: string,
  basename: string,
  ext: string,
  bt: number
}

function renameOlderFiles(containerFolder: string) {
  const allFilesWithBt: FileWithBt[] = []
  for (let file of fs.readdirSync(containerFolder)) {
    const filePath = path.join(containerFolder, file)
    let ext = path.extname(filePath)
    const basenameWithCount = path.basename(filePath, ext);
    let basename = basenameWithCount.split("@")[0]
    const stat = fs.statSync(filePath)
    allFilesWithBt.push({ path: filePath, dirname: path.dirname(filePath), basename, ext, bt: stat.birthtimeMs })
  }

  // we need to sort the files in decending rename order
  // because we need to start renaming from the oldest file
  // so there will be no namoing conflicts
  allFilesWithBt.sort((a, b) => {
    if (a.bt == b.bt) return 0;
    else if (a.bt > b.bt) return 1;
    else return -1;
  })

  allFilesWithBt.forEach((file, idx) => {
    const count = allFilesWithBt.length - idx;
    const newFilePath = file.dirname + "/" + file.basename + "@" + count + file.ext;
    fs.renameSync(file.path, newFilePath);
  })
}
