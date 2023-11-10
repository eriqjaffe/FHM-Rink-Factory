const { app, BrowserWindow, dialog, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const express = require('express')
const Jimp = require('jimp')
const openExplorer = require('open-file-explorer');
const imagemagickCli = require('imagemagick-cli');
const ttfInfo = require('ttfinfo')
const url = require('url');
const archiver = require('archiver');
const font2base64 = require("node-font2base64")
const fontname = require("fontname")
const Store = require("electron-store")
const chokidar = require("chokidar")

const app2 = express()
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

const server = app2.listen(0, () => {
	console.log(`Server running on port ${server.address().port}`);
});

app2.use(express.urlencoded({limit: '50mb', extended: true, parameterLimit: 50000}));

app2.get("/uploadImage", (req, res) => {
	dialog.showOpenDialog(null, {
		properties: ['openFile'],
		filters: [
			{ name: 'Images', extensions: ['jpg', 'png'] }
		]
	  }).then(result => {
		  if(!result.canceled) {
			var uploadedImg = null;
			console.log(path.extname(result.filePaths[0]))
			if (path.extname(result.filePaths[0]).toLowerCase() == ".gif") {
				imagemagickCli.exec('magick convert '+result.filePaths[0]+' '+tempDir+'/temp.png').then(({ stdout, stderr }) => {
					Jimp.read(tempDir+'/temp.png', (err, image) => {
						if (err) {
							console.log(err);
						} else {
							image.getBase64(Jimp.AUTO, (err, ret) => {
								res.json({
									"filename": path.basename(result.filePaths[0]),
									"image": ret
								  });
								res.end();
							})
						}
					});
				})
			} else {
				Jimp.read(result.filePaths[0], (err, image) => {
					if (err) {
						console.log(err);
					} else {
						image.getBase64(Jimp.AUTO, (err, ret) => {
							res.json({
								"filename": path.basename(result.filePaths[0]),
								"image": ret
							  });
							res.end();
						})
					}
				});
			}
			
		  }
	  }).catch(err => {
		console.log(err)
	  })
})

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

app2.get("/customFont", (req, res) => {
	dialog.showOpenDialog(null, {
		properties: ['openFile'],
		filters: [
			{ name: 'Fonts', extensions: ['ttf', 'otf'] }
		]
	}).then(result => {
		if(!result.canceled) {
			ttfInfo(result.filePaths[0], function(err, info) {
			var ext = getExtension(result.filePaths[0])
				const dataUrl = font2base64.encodeToDataUrlSync(result.filePaths[0])
				var fontPath = url.pathToFileURL(tempDir + '/'+path.basename(result.filePaths[0]))
				fs.copyFile(result.filePaths[0], tempDir + '/'+path.basename(result.filePaths[0]), (err) => {
					if (err) {
						console.log(err)
					} else {
						res.json({
							"fontName": info.tables.name[1],
							"fontStyle": info.tables.name[2],
							"familyName": info.tables.name[6],
							"fontFormat": ext,
							"fontMimetype": 'font/' + ext,
							"fontData": fontPath.href,
							'fontBase64': dataUrl
						});
						res.end()
					}
				})
			});
		}
	}).catch(err => {
		console.log(err)
	})
})

app2.post("/removeBorder", (req, res) => {
	var buffer = Buffer.from(req.body.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	var fuzz = parseInt(req.body.fuzz);
	Jimp.read(buffer, (err, image) => {
		if (err) {
			console.log(err);
		} else {
			image.write(tempDir+"/temp.png");
			imagemagickCli.exec('magick convert -trim -fuzz '+fuzz+'% '+tempDir+'/temp.png '+tempDir+'/temp.png').then(({ stdout, stderr }) => {
				Jimp.read(tempDir+"/temp.png", (err, image) => {
					if (err) {
						console.log(err);
					} else {
						image.getBase64(Jimp.AUTO, (err, ret) => {
							res.end(ret);
						})
					}
				})
			})
		}
	})
})

app2.post("/replaceColor", (req, res) => {
	var buffer = Buffer.from(req.body.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	var x = parseInt(req.body.x);
	var y = parseInt(req.body.y);
	var color = req.body.color;
	var newcolor = req.body.newcolor;
	var action = req.body.action;
	var fuzz = parseInt(req.body.fuzz);
	var cmdString;
	Jimp.read(buffer, (err, image) => {
		if (err) {
			console.log(err);
		} else {
			image.write(tempDir+"/temp.png");
			if (action == "replaceColorRange") {
				cmdString = 'magick convert '+tempDir+'/temp.png -fuzz '+fuzz+'% -fill '+newcolor+' -draw "color '+x+','+y+' floodfill" '+tempDir+'/temp.png';		
			} else {
				cmdString = 'magick convert '+tempDir+'/temp.png -fuzz '+fuzz+'% -fill '+newcolor+' -opaque '+color+' '+tempDir+'/temp.png';	
			}
			imagemagickCli.exec(cmdString).then(({ stdout, stderr }) => {
				Jimp.read(tempDir+"/temp.png", (err, image) => {
					if (err) {
						console.log(err);
					} else {
						image.getBase64(Jimp.AUTO, (err, ret) => {
							res.end(ret);
						})
					}
				})
			})
		}
	})
})

app2.post("/removeColorRange", (req, res) => {
	var buffer = Buffer.from(req.body.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	var x = parseInt(req.body.x);
	var y = parseInt(req.body.y);
	var fuzz = parseInt(req.body.fuzz);
	Jimp.read(buffer, (err, image) => {
		if (err) {
			console.log(err);
		} else {
			image.write(tempDir+"/temp.png", (err) => {
				imagemagickCli.exec('magick convert '+tempDir+'/temp.png -fuzz '+fuzz+'% -fill none -draw "color '+x+','+y+' floodfill" '+tempDir+'/temp.png')
				.then(({ stdout, stderr }) => {
					Jimp.read(tempDir+"/temp.png", (err, image) => {
						if (err) {
							console.log(err);
						} else {
							image.getBase64(Jimp.AUTO, (err, ret) => {
								res.end(ret);
							})
						}
					})
				})
			})
		}
 	})
})

app2.post('/removeAllColor', (req, res) => {
	var buffer = Buffer.from(req.body.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	var x = parseInt(req.body.x);
	var y = parseInt(req.body.y);
	var color = req.body.color;
	var fuzz = parseInt(req.body.fuzz);
	Jimp.read(buffer, (err, image) => {
		if (err) {
			console.log(err);		
		} else {
			image.write(tempDir+"/temp.png", (err) => {
				var cmdString = 'magick convert '+tempDir+'/temp.png -fuzz '+fuzz+'% -transparent '+color+' '+tempDir+'/temp.png';
				imagemagickCli.exec(cmdString).then(({ stdout, stderr }) => {
					Jimp.read(tempDir+"/temp.png", (err, image) => {
						if (err) {
							console.log(err);
						} else {
							image.getBase64(Jimp.AUTO, (err, ret) => {
								res.end(ret);
							})
						}
					})
				})
			})
		}
	})
});

app2.post('/saveRink', (req, res) => {
  	const images = Buffer.from(req.body.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
  	const staticLines = Buffer.from(req.body.rinkLines.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
	const json = Buffer.from(req.body.canvas, 'utf-8')

	var scratches0 = fs.readFileSync(__dirname + "/images/boards2.png", {encoding: 'base64'});
	var scratchLayer0 = Buffer.from(scratches0, 'base64');
	var scratches1 = fs.readFileSync(__dirname + "/images/overlay_1.png", {encoding: 'base64'});
	var scratchLayer1 = Buffer.from(scratches1, 'base64');
	var scratches2 = fs.readFileSync(__dirname + "/images/overlay_2.png", {encoding: 'base64'});
	var scratchLayer2 = Buffer.from(scratches2, 'base64');
	var scratches3 = fs.readFileSync(__dirname + "/images/overlay_3.png", {encoding: 'base64'});
	var scratchLayer3 = Buffer.from(scratches3, 'base64');

	const output = fs.createWriteStream(tempDir + '/'+req.body.name+'.zip');

	output.on('close', function() {
		var data = fs.readFileSync(tempDir + '/'+req.body.name+'.zip');
		var saveOptions = {
		  defaultPath: app.getPath('downloads') + '/' + req.body.name+'.zip',
		}
		dialog.showSaveDialog(null, saveOptions).then((result) => { 
		  if (!result.canceled) {
			fs.writeFile(result.filePath, data, function(err) {
			  if (err) {
				res.end("success")
				fs.unlink(tempDir + '/'+req.body.name+'.zip', (err) => {
				  if (err) {
					console.error(err)
					return
				  }
				})
				res.end("success")
			  } else {
				fs.unlink(tempDir + '/'+req.body.name+'.zip', (err) => {
				  if (err) {
					console.error(err)
					return
				  }
				})
				res.end("success")
			  };
			})
		  } else {
			fs.unlink(tempDir + '/'+req.body.name+'.zip', (err) => {
			  if (err) {
				console.error(err)
				return
			  }
			})
			res.end("success");
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
					archive.append(buff0, {name: req.body.name+"_0.png"})
					archive.append(buff1, {name: req.body.name+"_1.png"})
					archive.append(buff2, {name: req.body.name+"_2.png"})
					archive.append(buff3, {name: req.body.name+"_3.png"})
					archive.append(json, {name: req.body.name+".rink"})
					archive.finalize()
				}) 
			}) 
		}) 
	})

 	

	

	

	//archive.append(buff1, {name: req.body.name+"_0png"})
	

	//createFile (scratchLayer1, req.body.name+"_1.png")
	//createFile (scratchLayer2, req.body.name+"_2.png")
	//createFile (scratchLayer3, req.body.name+"_3.png")

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
	/* async function createFile(overlay, filename) {
		const base = await Jimp.read(images)
		const lines = await Jimp.read(staticLines)
		const ice = await Jimp.read(overlay)
		await base.resize(2880, 1344, Jimp.RESIZE_BEZIER).quality(100)
		await base.composite(lines, 0, 0)
		await base.composite(ice, 0, 0)
		await base.writeAsync(result.filePaths[0] +"/"  +filename)
		if (filename.substr(filename.length - 5) == "3.png") {
		  openExplorer(result.filePaths[0])
		  res.end("success")
		}
	} */
});

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
  
    mainWindow.loadURL(`file://${__dirname}/index.html?port=${server.address().port}`);

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
  
