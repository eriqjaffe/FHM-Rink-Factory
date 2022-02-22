const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const express = require('express')
const Jimp = require('jimp')
const openExplorer = require('open-file-explorer');
const sharp = require('sharp')

const app2 = express()
const port = 8086;

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
	  }).catch(err => {
		console.log(err)
	  })
})

app2.post("/saveJersey", (req, res) => {
  console.log(req.body)
  var buffer = Buffer.from(req.body.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
})

app2.post('/saveRink', (req, res) => {
  const images = Buffer.from(req.body.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
  const staticLines = Buffer.from(req.body.rinkLines.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');

	const options = {
		defaultPath: app.getPath('desktop'),
    title: "Choose a folder to save the rink images",
    properties: ['openFile', 'openDirectory', 'createDirectory', 'promptToCreate' ], 
	}

	dialog.showOpenDialog(null, { options }).then((result) => {
		if (!result.canceled) {
      var scratches0 = fs.readFileSync(__dirname + "\\images\\boards2.png", {encoding: 'base64'});
      var scratchLayer0 = Buffer.from(scratches0, 'base64');
      var scratches1 = fs.readFileSync(__dirname + "\\images\\overlay_1.png", {encoding: 'base64'});
      var scratchLayer1 = Buffer.from(scratches1, 'base64');
      var scratches2 = fs.readFileSync(__dirname + "\\images\\overlay_2.png", {encoding: 'base64'});
      var scratchLayer2 = Buffer.from(scratches2, 'base64');
      var scratches3 = fs.readFileSync(__dirname + "\\images\\overlay_3.png", {encoding: 'base64'});
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
        await base.writeAsync(result.filePaths[0] +"\\"  +filename)
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
      icon: (__dirname + '/images/hockey-rink.png'),
      webPreferences: {
        //preload: path.join(__dirname, 'preload.js')
      }
    })
  
    mainWindow.loadFile('index.html')
  
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
  
