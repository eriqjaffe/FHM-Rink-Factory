const { app, BrowserWindow, dialog } = require('electron')

function createWindow () {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 1500,
      height: 760,
      //icon: (__dirname + '/images/ballcap.png'),
      webPreferences: {
        //preload: path.join(__dirname, 'preload.js')
      }
    })
  
    mainWindow.loadFile('index.html')
  
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
  }
  
  app.whenReady().then(() => {
    createWindow()
  
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })
  
