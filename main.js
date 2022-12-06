// https://www.youtube.com/watch?v=ML743nrkMHw&ab_channel=TraversyMedia

const path = require('path')
const os = require('os')
const fs = require('fs')
const resizeImg = require('resize-img') // https://github.com/kevva/resize-img
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')

process.env.NODE_ENV = 'development'

const isDev = process.env.NODE_ENV !== 'production'
const isMac = process.platform === 'darwin'

let mainWindow;

// Create the main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Image Resizer',
    width: 500,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // This opens dev tools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

// Create about window
function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    title: 'About Image Resizer',
    width: 300,
    height: 300
  });

  aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

// app.on('ready', (
//   // function
//   ))

// App is ready
app.whenReady().then(() => {
  createMainWindow();

  // Implement menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // Remove mainWindow from memory on close
  mainWindow.on('closed', () => (mainWindow = null))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
});

// Menu template
const menu = [
  // Optional to do it this way too
  // {
  //   role: 'fileMenu',
  // },
  ...(isMac ? [
    {
      label: app.name,
      submenu: [
        {
          label: 'About',
          click: createAboutWindow
        }
      ]
    }
  ] : []),
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        click: () => app.quit(),
        accelerator: 'CmdorCtrl+W'
      }
    ]
  },
  ...(!isMac ? [
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: createAboutWindow
        }
      ]
    }
  ] : [])
];

// Respond to ipcRenderer resize
ipcMain.on('image:resize', (event, options) => {
  options.dest = path.join(os.homedir(), 'imageresizer')
  resizeImage(options)
})

// Resize the image
async function resizeImage({ imgPath, width, height, dest }) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height
    });

    // Create filename
    const filename = path.basename(imgPath)

    // Create dest folder if not exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    
    // Write file to dest
    fs.writeFileSync(path.join(dest, filename), newPath);

    // Send success to renderer for alert
    mainWindow.webContents.send('image:done')

    // Open dest folder
    shell.openPath(dest)

  } catch (error) {
    console.log(error)
  }
}

// On closing the application
// Check in the platform is not a Mac
app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})