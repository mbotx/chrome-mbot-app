chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create(
      "../../src/web/index.html",
      {
        innerBounds: { width: 300, height: 440, minWidth: 300, maxWidth: 300, minHeight: 440, maxHeight: 440 }
      });
});
function initHID(port){
    port.onMessage.addListener(function(msg) {
      if(msg.method=="list"){
        chrome.hid.getDevices({vendorId:0x0416,productId:0xffff},function(devices){
            port.postMessage({method:msg.method,devices:devices});
        });
      }
    });
    chrome.hid.onDeviceAdded.addListener(function(device){
        port.postMessage({event:"__DEVICE_ADDED__",device:device});
    });
    chrome.hid.onDeviceRemoved.addListener(function(deviceId){
        port.postMessage({event:"__DEVICE_REMOVED__",deviceId:deviceId});
    });
}
chrome.runtime.onConnect.addListener(function(port){
  if(port.name=="hid"){
    initHID(port);
  }
});