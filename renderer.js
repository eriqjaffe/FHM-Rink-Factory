const { app, shell, ipcRenderer } = require('electron')

ipcRenderer.on('load-rink', (event, data) => {
    $("#load").trigger("click")
})

ipcRenderer.on('save-rink', (event, data) => {
    $("#save").trigger("click")
})

ipcRenderer.on('updateFonts', (event, data) => {
    $("#localFontFolder").trigger("click")
})

ipcRenderer.on('about', (event, data) => {
    $("#aboutRinkFactory").trigger("click")
});

ipcRenderer.on('openFontFolder', (event, data) => {
    $("#openFontFolder").trigger("click")
})