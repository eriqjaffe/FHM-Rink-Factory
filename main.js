const { app, BrowserWindow, dialog, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const Jimp = require('jimp')
const imagemagickCli = require('imagemagick-cli');
const url = require('url');
const archiver = require('archiver');
const font2base64 = require("node-font2base64")
const fontname = require("fontname")
const Store = require("electron-store")
const chokidar = require("chokidar")
const increment = require('add-filename-increment');

const tempDir = os.tmpdir()
const isMac = process.platform === 'darwin'
const store = new Store();
const userFontsFolder = path.join(app.getPath('userData'),"fonts")

if (!fs.existsSync(userFontsFolder)) {
    fs.mkdirSync(userFontsFolder);
}

if (!fs.existsSync(userFontsFolder+"/README.txt")) {
	var writeStream = fs.createWriteStream(userFontsFolder+"/README.txt");
	writeStream.write("TTF and OTF fonts dropped into this folder will automatically be imported into the Rink Factory!\r\n\r\nFonts removed from this folder will still be available in the Rink Factory until you quit the app, and they will not reload after that.")
	writeStream.end()
}

const watcher = chokidar.watch(userFontsFolder, {
	ignored: /(^|[\/\\])\../, // ignore dotfiles
	persistent: true
});

watcher.on('ready', () => {})

ipcMain.on('upload-font', (event, arg) => {
    let json = {}
    const options = {
		defaultPath: store.get("uploadFontPath", app.getPath('desktop')),
		properties: ['openFile'],
		filters: [
			{ name: 'Fonts', extensions: ['ttf', 'otf'] }
		]
	}
	dialog.showOpenDialog(null, options).then(result => {
		if(!result.canceled) {
			store.set("uploadFontPath", path.dirname(result.filePaths[0]))
			const filePath = path.join(userFontsFolder,path.basename(result.filePaths[0]))
			try {
				const fontMeta = fontname.parse(fs.readFileSync(result.filePaths[0]))[0];
				var ext = getExtension(result.filePaths[0])
				var fontPath = url.pathToFileURL(result.filePaths[0])
				json = {
					"status": "ok",
					"fontName": fontMeta.fullName,
					"fontStyle": fontMeta.fontSubfamily,
					"familyName": fontMeta.fontFamily,
					"fontFormat": ext,
					"fontMimetype": 'font/' + ext,
					"fontData": fontPath.href,
					"fontPath": filePath
				};
				fs.copyFileSync(result.filePaths[0], filePath)
				event.sender.send('add-font-response', json)
			} catch (err) {
				json = {
					"status": "error",
					"fontName": path.basename(result.filePaths[0]),
					"fontPath": result.filePaths[0],
					"message": err
				}
				event.sender.send('add-font-response', json)
				//fs.unlinkSync(result.filePaths[0])
			}
		} else {
            json.status = "cancelled"
			event.sender.send('add-font-response', json)
		}
	}).catch(err => {
		console.log(err)
		res.json({
			"status":"error",
			"message": err
		})
		res.end()
	})
})

ipcMain.on('upload-image', (event, arg) => {
    let json = {}
    const options = {
		defaultPath: store.get("uploadImagePath", app.getPath('pictures')),
		properties: ['openFile'],
		filters: [
			{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'] }
		]
	}
    dialog.showOpenDialog(null, options).then(result => {
        if (!result.canceled) {
			store.set("uploadImagePath", path.dirname(result.filePaths[0]))
            Jimp.read(result.filePaths[0], (err, image) => {
				if (err) {
					json.filename = "error not an image"
					json.image = "error not an image"
					event.sender.send('add-image-response', json)
				} else {
					image.getBase64(Jimp.AUTO, (err, ret) => {
						json.path = result.filePaths[0]
						json.filename = path.basename(result.filePaths[0])
						json.image = ret
						json.path = result.filePaths[0]
						event.sender.send('add-image-response', json)
					})
				}
			})
            .catch(err => { json.filename = "error not an image"
                json.image = "error not an image"
                event.sender.send('add-image-response', err) 
            })
        } else {
            res.end()
			  console.log("cancelled")
        }
    })
})

ipcMain.on('open-folder', (event, arg) => {
	switch (arg) {
		case "fonts":
			shell.openPath(userFontsFolder)
			break;
	}
})

ipcMain.on('local-font-folder', (event, arg) => {
	const jsonObj = {}
	const jsonArr = []

	filenames = fs.readdirSync(userFontsFolder);
	for (i=0; i<filenames.length; i++) {
        if (path.extname(filenames[i]).toLowerCase() == ".ttf" || path.extname(filenames[i]).toLowerCase() == ".otf") {
			const filePath = path.join(userFontsFolder,filenames[i])
			try {
				const fontMeta = fontname.parse(fs.readFileSync(filePath))[0];
				var ext = getExtension(filePath)
				const dataUrl = font2base64.encodeToDataUrlSync(filePath)
				var fontPath = url.pathToFileURL(filePath)
				var json = {
					"status": "ok",
					"fontName": fontMeta.fullName,
					"fontStyle": fontMeta.fontSubfamily,
					"familyName": fontMeta.fontFamily,
					"fontFormat": ext,
					"fontMimetype": 'font/' + ext,
					"fontData": fontPath.href,
					"fontBase64": dataUrl,
					"fontPath": filePath,
				};
				jsonArr.push(json)
			} catch (err) {
				const json = {
					"status": "error",
					"fontName": path.basename(filePath),
					"fontPath": filePath,
					"message": err
				}
				jsonArr.push(json)
				//fs.unlinkSync(filePath)
			}
		}
	}
	jsonObj.result = "success"
	jsonObj.fonts = jsonArr
	event.sender.send('local-font-folder-response', jsonObj)
})

ipcMain.on('remove-border', (event, arg) => {
	let imgdata = arg.imgdata
	let fuzz = parseInt(arg.fuzz)
	let pictureName = arg.pictureName
	let canvas = arg.canvas
	let imgLeft = arg.imgLeft
	let imgTop = arg.imgTop
	let path = arg.path
	let scaleX = arg.scaleX
	let scaleY = arg.scaleY
	let json = {}
	let buffer = Buffer.from(imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	
	Jimp.read(buffer, (err, image) => {
		if (err) {
			console.log(err);
		} else {
			try {
				image.write(tempDir+"/temp.png");
				imagemagickCli.exec('magick convert -trim -fuzz '+fuzz+'% '+tempDir+'/temp.png '+tempDir+'/temp.png').then(({ stdout, stderr }) => {
					Jimp.read(tempDir+"/temp.png", (err, image) => {
						if (err) {
							json.status = 'error'
							json.message = err
							console.log(err);
							event.sender.send('imagemagick-response', json)
						} else {
							image.getBase64(Jimp.AUTO, (err, ret) => {
								json.status = 'success'
								json.data = ret
								json.canvas = canvas
								json.pTop = imgTop
								json.pLeft = imgLeft
								json.pictureName = pictureName
								json.path = path
								json.scaleX = scaleX
								json.scaleY = scaleY
								event.sender.send('imagemagick-response', json)
							})
						}
					})
				})
			} catch (error) {
				json.status = 'error'
				json.message = "An error occurred - please make sure ImageMagick is installed"
				console.log(error);
				event.sender.send('imagemagick-response', json)
			}
		}
	})
})

ipcMain.on('remove-color-range', (event, arg) => {
	let buffer = Buffer.from(arg.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	let x = parseInt(arg.x);
	let y = parseInt(arg.y);
	let imgTop = arg.pTop
	let imgLeft = arg.pLeft
	let pScaleX = arg.pScaleX
	let pScaleY = arg.pScaleY
	let pictureName = arg.pictureName
	let fuzz = parseInt(arg.fuzz);
	let path = arg.path
	let json = {}
	Jimp.read(buffer, (err, image) => {
		if (err) {
			json.status = 'error'
			json.message = "An error occurred - please make sure ImageMagick is installed"
			console.log(err);
			event.sender.send('imagemagick-response', json)
		} else {
			image.write(tempDir+"/temp.png", (err) => {
				try {
					imagemagickCli.exec('magick convert '+tempDir+'/temp.png -fuzz '+fuzz+'% -fill none -draw "color '+x+','+y+' floodfill" '+tempDir+'/temp.png')
					.then(({ stdout, stderr }) => {
						Jimp.read(tempDir+"/temp.png", (err, image) => {
							if (err) {
								json.status = 'error'
								json.message = "An error occurred - please make sure ImageMagick is installed"
								console.log(err);
								event.sender.send('imagemagick-response', json)
							} else {
								image.getBase64(Jimp.AUTO, (err, ret) => {
									json.status = 'success'
									json.data = ret
									json.x = x
									json.y = y
									json.pTop = imgTop
									json.pLeft = imgLeft
									json.scaleX = pScaleX
									json.scaleY = pScaleY
									json.pictureName = pictureName
									json.path = path
									event.sender.send('imagemagick-response', json)
								})
							}
						})
					})
				} catch (error) {
					json.status = 'error'
					json.message = "An error occurred - please make sure ImageMagick is installed"
					console.log(err);
					event.sender.send('imagemagick-response', json)
				}
				
			})
		}
 	})
})

ipcMain.on('remove-all-color', (event, arg) => {
	let buffer = Buffer.from(arg.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	let x = parseInt(arg.x);
	let y = parseInt(arg.y);
	let pTop = arg.pTop
	let pLeft = arg.pLeft
	let pScaleX = arg.pScaleX
	let pScaleY = arg.pScaleY
	let pictureName = arg.pictureName
	let fuzz = parseInt(arg.fuzz);
	let color = arg.color
	let path = arg.path
	let json = {}
	Jimp.read(buffer, (err, image) => {
		if (err) {
			json.status = 'error'
			json.message = err
			console.log(err);
			event.sender.send('imagemagick-response', json)
		} else {
			image.write(tempDir+"/temp.png", (err) => {
				try {
					imagemagickCli.exec('magick convert '+tempDir+'/temp.png -fuzz '+fuzz+'% -transparent '+color+' '+tempDir+'/temp.png')
					.then(({ stdout, stderr }) => {
						Jimp.read(tempDir+"/temp.png", (err, image) => {
							if (err) {
								json.status = 'error'
								json.message = err
								console.log(err);
								event.sender.send('imagemagick-response', json)
							} else {
								image.getBase64(Jimp.AUTO, (err, ret) => {
									json.status = 'success'
									json.data = ret
									json.x = x
									json.y = y
									json.pTop = pTop
									json.pLeft = pLeft
									json.scaleX = pScaleX
									json.scaleY = pScaleY
									json.pictureName = pictureName
									json.path = path
									event.sender.send('imagemagick-response', json)
								})
							}
						})
					})
				} catch (error) {
					json.status = 'error'
					json.message = "An error occurred - please make sure ImageMagick is installed"
					console.log(err);
					event.sender.send('imagemagick-response', json)
				}
				
			})
		}
 	})
})

ipcMain.on('replace-color', (event, arg) => {
	let imgdata = arg.imgdata
	let pLeft = arg.pLeft
	let pTop = arg.pTop
	let pScaleX = arg.pScaleX
	let pScaleY = arg.pScaleY
	let action = arg.action
	let color = arg.color
	let newcolor = arg.newcolor
	let fuzz = arg.fuzz
	let pictureName = arg.pictureName
	let x = arg.x
	let y = arg.y
	let path = arg.path
	let json = {}
	var buffer = Buffer.from(imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	Jimp.read(buffer, (err, image) => {
		if (err) {
			json.status = "error"
			json.message = err
			event.sender.send('imagemagick-response', json)
		} else {
			image.write(tempDir+"/temp.png");
      if (action == "replaceColorRange") {
				cmdString = 'magick convert '+tempDir+'/temp.png -fuzz '+fuzz+'% -fill '+newcolor+' -draw "color '+x+','+y+' floodfill" '+tempDir+'/temp.png';		
			} else {
				cmdString = 'magick convert '+tempDir+'/temp.png -fuzz '+fuzz+'% -fill '+newcolor+' -opaque '+color+' '+tempDir+'/temp.png';	
			}
			try {
				imagemagickCli.exec(cmdString).then(({ stdout, stderr }) => {
					Jimp.read(tempDir+"/temp.png", (err, image) => {
						if (err) {
							json.status = "error"
							json.message = err
							event.sender.send('imagemagick-response', json)
						} else {
							image.getBase64(Jimp.AUTO, (err, ret) => {
								json.status = "success"
								json.data = ret
								json.pTop = pTop
								json.pLeft = pLeft
								json.x = pScaleX
								json.y = pScaleY
								json.pictureName = pictureName
								json.scaleX = pScaleX
								json.scaleY = pScaleY
								json.path = path
								event.sender.send('imagemagick-response', json)
							})
						}
					})
				})
			} catch (error) {
				json.status = 'error'
				json.message = "An error occurred - please make sure ImageMagick is installed"
				console.log(err);
				event.sender.send('remove-border-response', json)
			}
		}
	})
})

ipcMain.on('save-rink', (event, arg) => {
	const images = Buffer.from(arg.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
  	const staticLines = Buffer.from(arg.rinkLines.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	const json = Buffer.from(arg.canvas, 'utf-8')

	var scratches0 = fs.readFileSync(__dirname + "/images/boards2.png", {encoding: 'base64'});
	var scratchLayer0 = Buffer.from(scratches0, 'base64');
	var scratches1 = fs.readFileSync(__dirname + "/images/overlay_1.png", {encoding: 'base64'});
	var scratchLayer1 = Buffer.from(scratches1, 'base64');
	var scratches2 = fs.readFileSync(__dirname + "/images/overlay_2.png", {encoding: 'base64'});
	var scratchLayer2 = Buffer.from(scratches2, 'base64');
	var scratches3 = fs.readFileSync(__dirname + "/images/overlay_3.png", {encoding: 'base64'});
	var scratchLayer3 = Buffer.from(scratches3, 'base64');

	const output = fs.createWriteStream(tempDir + '/'+arg.name+'.zip');

	output.on('close', function() {
		var data = fs.readFileSync(tempDir + '/'+arg.name+'.zip');
		var saveOptions = {
			defaultPath: increment(store.get("downloadPath", app.getPath('downloads')) + '/' + arg.name+'.zip',{fs: true})
		}
		dialog.showSaveDialog(null, saveOptions).then((result) => { 
		  if (!result.canceled) {
			store.set("downloadPath", path.dirname(result.filePath))
			fs.writeFile(result.filePath, data, function(err) {
			  if (err) {
				event.sender.send('save-rink-response', arg)
				fs.unlink(tempDir + '/'+arg.name+'.zip', (err) => {
				  if (err) {
					event.sender.send('save-rink-response', arg)
					return
				  }
				})
				res.end("success")
			  } else {
				fs.unlink(tempDir + '/'+arg.name+'.zip', (err) => {
				  if (err) {
					event.sender.send('save-rink-response', arg)
					return
				  }
				})
				event.sender.send('save-rink-response', arg)
			  };
			})
		  } else {
			fs.unlink(tempDir + '/'+arg.name+'.zip', (err) => {
			  if (err) {
				console.error(err)
				return
			  }
			})
			event.sender.send('save-rink-response', arg)
		  }
		})
	});

	const archive = archiver('zip', {
		lib: { level: 9 } // Sets the compression level.
	});
		
	archive.on('error', function(err) {
		throw err;
	});

	archive.pipe(output)


    createFile (scratchLayer0)
	.then(function(response) {
		const buff0 = response;
		createFile (scratchLayer1)
		.then(function(response) {
			const buff1 = response;
			createFile (scratchLayer2)
			.then(function(response) {
				const buff2 = response;
				createFile (scratchLayer3)
				.then(function(response) {
					const buff3 = response;
					archive.append(buff0, {name: arg.name+"_0.png"})
					archive.append(buff1, {name: arg.name+"_1.png"})
					archive.append(buff2, {name: arg.name+"_2.png"})
					archive.append(buff3, {name: arg.name+"_3.png"})
					archive.append(json, {name: arg.name+".rink"})
					archive.finalize()
				}) 
			}) 
		}) 
	})

	async function createFile(overlay) {
		let base = await Jimp.read(images)
		let lines = await Jimp.read(staticLines)
		let ice = await Jimp.read(overlay)
		await base.resize(2880, 1344, Jimp.RESIZE_BEZIER).quality(100)
		await base.composite(lines, 0, 0)
		await base.composite(ice, 0, 0)
		let buffer = await base.getBufferAsync(Jimp.MIME_PNG)
		return buffer
	}
})

function getExtension(filename) {
	var ext = path.extname(filename||'').split('.');
	return ext[ext.length - 1];
}

function createWindow () {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 1500,
      height: 760,
      icon: (__dirname + '/images/zamboni.png'),
      webPreferences: {
	      nodeIntegration: true,
          contextIsolation: false
        //preload: path.join(__dirname, 'preload.js')
      }
    })

	watcher.on('add', (path, stats) => {
		mainWindow.webContents.send('updateFonts','click')
	})

	const template = [
		// { role: 'appMenu' }
		...(isMac ? [{
			label: app.name,
			submenu: [
			{ role: 'about' },
			{ type: 'separator' },
			{ role: 'services' },
			{ type: 'separator' },
			{ role: 'hide' },
			{ role: 'hideOthers' },
			{ role: 'unhide' },
			{ type: 'separator' },
			{ role: 'quit' }
			]
		}] : []),
		// { role: 'fileMenu' }
		{
			label: 'File',
			submenu: [
			isMac ? { role: 'close' } : { role: 'quit' }
			]
		},
		// { role: 'viewMenu' }
		{
			label: 'View',
			submenu: [
			{ role: 'reload' },
			{ role: 'forceReload' },
			{ role: 'toggleDevTools' },
			{ type: 'separator' },
			{ role: 'resetZoom' },
			{ role: 'zoomIn' },
			{ role: 'zoomOut' },
			{ type: 'separator' },
			{ role: 'togglefullscreen' }
			]
		},
		// { role: 'windowMenu' }
		{
			label: 'Window',
			submenu: [
			{ role: 'minimize' },
			{ role: 'zoom' },
			...(isMac ? [
				{ type: 'separator' },
				{ role: 'front' },
				{ type: 'separator' },
				{ role: 'window' }
			] : [
				{ role: 'close' }
			])
			]
		},
		{
			role: 'help',
			submenu: [
				{
					click: () => mainWindow.webContents.send('about','click'),
						label: 'About the FHM Rink Factory',
				},
				{
					label: 'About Franchise Hockey Manager',
					click: async () => {    
					await shell.openExternal('https://www.ootpdevelopments.com/franchise-hockey-manager-home/')
					}
				},
				{
					label: 'About Node.js',
					click: async () => {    
					await shell.openExternal('https://nodejs.org/en/about/')
					}
				},
				{
					label: 'About Electron',
					click: async () => {
					await shell.openExternal('https://electronjs.org')
					}
				},
				{
					label: 'View project on GitHub',
					click: async () => {
					await shell.openExternal('https://github.com/eriqjaffe/FHM-Rink-Factory')
					}
				}
			]
		}
	]
		
	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)
  
    mainWindow.loadURL(`file://${__dirname}/index.html`);

	mainWindow.webContents.on('new-window', function(e, url) {
		e.preventDefault();
		shell.openExternal(url);
	});
  
    // Open the DevTools.
      mainWindow.maximize()
      mainWindow.webContents.openDevTools()
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
  
