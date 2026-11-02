const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronDesktop', {
  plataforma: process.platform,
  versaoApp: '1.0.0'
});
