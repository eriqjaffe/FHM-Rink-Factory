const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const express = require('express')
const Jimp = require('jimp')

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

app2.post('/saveJersey', (req, res) => {
	var buffer = Buffer.from(req.body.imgdata.replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');

	const options = {
		defaultPath: app.getPath('desktop') + '/' + req.body.name + ".zip",
	}

	dialog.showOpenDialog(null, {
    properties: ['openFile', 'openDirectory', 'createDirectory', 'promptToCreate' ]
  }).then((result) => {
		if (!result.canceled) {
      console.log(result.filePaths[0])
      var scratches0 = fs.readFileSync(__dirname + "\\images\\boards2.png", {encoding: 'base64'});
      var scratchLayer0 = Buffer.from(scratches0, 'base64');
      var scratches1 = fs.readFileSync(__dirname + "\\images\\overlay_1.png", {encoding: 'base64'});
      var scratchLayer1 = Buffer.from(scratches1, 'base64');
      var scratches2 = fs.readFileSync(__dirname + "\\images\\overlay_2.png", {encoding: 'base64'});
      var scratchLayer2 = Buffer.from(scratches2, 'base64');
      var scratches3 = fs.readFileSync(__dirname + "\\images\\overlay_3.png", {encoding: 'base64'});
      var scratchLayer3 = Buffer.from(scratches3, 'base64');
      Jimp.read(buffer, (err, fir_img) => {
        if(err) {
          console.log(err);
        } else {
            Jimp.read(scratchLayer0, (err, ice_img) => {
              if (err) {
                console.log(err)
              } else {
                fir_img.composite(ice_img, 0, 0)
                fir_img.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
                  const finalImage = Buffer.from(buffer).toString('base64');
                  fs.writeFile(result.filePaths[0] +"\\"  +req.body.name+"_0.png", finalImage, 'base64', function(err) {
                    if (!err) { 
                      
                    }
                  })
                })
              }
            })
          }
        });
			Jimp.read(buffer, (err, sec_img) => {
        if(err) {
          console.log(err);
        } else {
            Jimp.read(scratchLayer1, (err, ice_img) => {
              if (err) {
                console.log(err)
              } else {
                sec_img.composite(ice_img, 0, 0)
                sec_img.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
                  const finalImage = Buffer.from(buffer).toString('base64');
                  fs.writeFile(result.filePaths[0] +"\\"  +req.body.name+"_1.png", finalImage, 'base64', function(err) {
                    if (!err) { 
                      
                    }
                  })
                })
              }
            })
          }
        });
      Jimp.read(buffer, (err, thi_img) => {
        if(err) {
          console.log(err);
        } else {
            Jimp.read(scratchLayer2, (err, ice_img) => {
              if (err) {
                console.log(err)
              } else {
                thi_img.composite(ice_img, 0, 0)
                thi_img.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
                  const finalImage = Buffer.from(buffer).toString('base64');
                  fs.writeFile(result.filePaths[0] +"\\"  +req.body.name+"_2.png", finalImage, 'base64', function(err) {
                    if (!err) { 
                      
                    }
                  })
                })
              }
            })
          }
        });
      Jimp.read(buffer, (err, fth_img) => {
        if(err) {
          console.log(err);
        } else {
            Jimp.read(scratchLayer3, (err, ice_img) => {
              if (err) {
                console.log(err)
              } else {
                fth_img.composite(ice_img, 0, 0)
                fth_img.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
                  const finalImage = Buffer.from(buffer).toString('base64');
                  fs.writeFile(result.filePaths[0] +"\\"  +req.body.name+"_3.png", finalImage, 'base64', function(err) {
                    if (!err) { 

                    }
                  })
                })
              }
            })
          }
        });
		} 
	}).catch((err) => {
		console.log(err);
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
  
