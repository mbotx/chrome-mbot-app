chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create(
      "../../src/web/index.html",
      {
        innerBounds: { width: 300, height: 440, minWidth: 300, maxWidth: 300, minHeight: 440, maxHeight: 440 }
      });
});
var scratchPort;
var ports = [];

//serial
function setupSerial(port){
    var interval;
    port.onMessage.addListener(function(msg) {
      if(msg.method=="list"){
        chrome.serial.getDevices(function(devices){
            port.postMessage({method:msg.method,devices:devices});
        });
      }else if(msg.method=="connect"){
        chrome.serial.connect(msg.path,{bitrate:115200}, function(connectInfo) {
            if (!connectInfo) {
              port.postMessage({method:msg.method,connectionId:-1});
            }else{
              port.postMessage({method:msg.method,connectionId:connectInfo.connectionId});
            }
        });
      }else if(msg.method=="disconnect"){
        chrome.serial.disconnect(msg.connectionId, function() {
            port.postMessage({method:msg.method});
        });
      }else if(msg.method=="send"){
        var len = msg.data.length;
        var bytes = new Uint8Array(len);
        for(var i=0;i<len;i++){
          bytes[i] = msg.data[i];
        }
        chrome.serial.send(msg.connectionId, bytes.buffer, function() {
            port.postMessage({method:msg.method,data:msg.data});
        });
      }
    });
    chrome.serial.onReceive.addListener(function(obj){ 
        var bytes = new Uint8Array(obj.data);
        var buffer = [];
        var len = bytes.length;
        for(var i=0;i<len;i++){
          buffer.push(bytes[i]);
        }
        if(len>0){
          scratchPort.postMessage({buffer:buffer});
          port.postMessage({event:"__DATA_RECEIVED__",data:buffer});
        }
    });
}
//bluetooth
function setupBluetooth(port){

}
//hid
function setupHID(port){
    var interval;
    port.onMessage.addListener(function(msg) {
      if(msg.method=="list"){
        chrome.hid.getDevices({vendorId:0x0416,productId:0xffff},function(devices){
            port.postMessage({method:msg.method,devices:devices});
        });
      }else if(msg.method=="connect"){
        chrome.hid.connect(msg.deviceId, function(connectInfo) {
            if (!connectInfo) {
              port.postMessage({method:msg.method,connectionId:-1});
            }else{
              port.postMessage({method:msg.method,connectionId:connectInfo.connectionId});
            }
        });
      }else if(msg.method=="receive"){
        chrome.hid.receive(msg.connectionId, function(reportId, data) {
            var bytes = new Uint8Array(data);
            var buffer = [];
            for(var i=0;i<bytes.length;i++){
              buffer[i] = bytes[i]; 
            }
            port.postMessage({method:msg.method,data:buffer});
            scratchPort.postMessage(buffer);
        });
      }else if(msg.method=="disconnect"){
        clearTimeout(interval);
        chrome.hid.disconnect(msg.connectionId, function() {
            port.postMessage({method:msg.method});
        });
      }else if(msg.method=="send"){
        var len = msg.data.length;
        var bytes = new Uint8Array(len+1);
        bytes[0] = len;
        for(var i=0;i<len;i++){
          bytes[i+1] = msg.data[i];
        }
        chrome.hid.send(msg.connectionId, 0, bytes.buffer, function() {
            port.postMessage({method:msg.method,data:msg.data});
        });
      }else if(msg.method=="poll"){
        function poll(){
          chrome.hid.receive(msg.connectionId, function(reportId,data) {
            var bytes = new Uint8Array(data);
            var buffer = [];
            var len = bytes[0];
            for(var i=0;i<len;i++){
              buffer.push(bytes[i+1]);
            }
            if(len>0){
              scratchPort.postMessage({buffer:buffer});
              port.postMessage({event:"__DATA_RECEIVED__",data:buffer});
            }
            clearTimeout(interval);
            interval = setTimeout(poll,10);
          });
        }
        clearTimeout(interval);
        interval = setTimeout(poll,10);
      }
    });
    chrome.hid.onDeviceAdded.addListener(function(device){
        port.postMessage({event:"__DEVICE_ADDED__",device:device});
    });
    chrome.hid.onDeviceRemoved.addListener(function(deviceId){
        port.postMessage({event:"__DEVICE_REMOVED__",deviceId:deviceId});
    });
}

chrome.runtime.onConnectExternal.addListener(function(port){
  console.log(port);
  scratchPort = port;
  scratchPort.onMessage.addListener(function(msg){
    for(var i in ports){
      ports[i].postMessage({event:"__COMMAND_RECEIVED__",data:msg.buffer});
    }
  });
});
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
    var resp = {};
    if(ports.length==0){
      resp.status = false;
      sendResponse(resp);
    }else{
      resp.status = true;
      sendResponse(resp);
    }
});
chrome.runtime.onConnect.addListener(function(port){
  ports.push(port);
  if(port.name=="hid"){
    setupHID(port);
  }else if(port.name=="serial"){
    setupSerial(port);
  }else if(port.name=="bluetooth"){
    setupBluetooth(port);
  }
});