const { app, shell, ipcRenderer } = require('electron')

ipcRenderer.on('updateFonts', (event, data) => {
    $("#localFontFolder").trigger("click")
})

ipcRenderer.on('about', (event, data) => {
    $("#aboutRinkFactory").trigger("click")
});