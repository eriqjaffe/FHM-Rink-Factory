const { app, BrowserWindow, dialog, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const express = require('express')
const Jimp = require('jimp')
const openExplorer = require('open-file-explorer');
const imagemagickCli = require('imagemagick-cli');
const ttfInfo = require('ttfinfo')
const url = require('url');
const output = require('image-output')

const app2 = express()
const port = 8086;
const tempDir = os.tmpdir()
const isMac = process.platform === 'darwin'

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

app2.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app2.use(express.urlencoded({limit: '50mb', extended: true, parameterLimit: 50000}));

app2.get("/uploadImage", (req, res) => {
	dialog.showOpenDialog(null, {
		properties: ['openFile'],
		filters: [
			{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }
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
							"fontData": fontPath.href
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

	const options = {
		defaultPath: app.getPath('desktop'),
    title: "Choose a folder to save the rink images",
	}

	dialog.showOpenDialog(null, { properties: ['openFile', 'openDirectory', 'createDirectory', 'promptToCreate' ] }).then((result) => {
		if (!result.canceled) {
      var scratches0 = fs.readFileSync(__dirname + "/images/boards2.png", {encoding: 'base64'});
      var scratchLayer0 = Buffer.from(scratches0, 'base64');
      var scratches1 = fs.readFileSync(__dirname + "/images/overlay_1.png", {encoding: 'base64'});
      var scratchLayer1 = Buffer.from(scratches1, 'base64');
      var scratches2 = fs.readFileSync(__dirname + "/images/overlay_2.png", {encoding: 'base64'});
      var scratchLayer2 = Buffer.from(scratches2, 'base64');
      var scratches3 = fs.readFileSync(__dirname + "/images/overlay_3.png", {encoding: 'base64'});
      var scratchLayer3 = Buffer.from(scratches3, 'base64');
      
      createFile (scratchLayer0, req.body.name+"_0.png")
      createFile (scratchLayer1, req.body.name+"_1.png")
      createFile (scratchLayer2, req.body.name+"_2.png")
      createFile (scratchLayer3, req.body.name+"_3.png")

      async function createFile(overlay, filename) {
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
      }
		} else {
      res.end("success")
    }
	}).catch((err) => {
		res.end(err);
	});
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
        //preload: path.join(__dirname, 'preload.js')
      }
    })
  
    mainWindow.loadFile('index.html')

	mainWindow.webContents.on('new-window', function(e, url) {
		e.preventDefault();
		shell.openExternal(url);
	});
  
    // Open the DevTools.
    // mainWindow.maximize()
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
  
