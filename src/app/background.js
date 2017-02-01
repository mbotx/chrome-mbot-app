chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create(
      "../../src/web/index.html",
      {
        innerBounds: { width: 340, height: 460, minWidth: 340, maxWidth: 340, minHeight: 460, maxHeight: 460 }
      });
});
var scratchPort;
var ports = [];
var hidConnected = false;
var serialConnected = false;
var bluetoothConnected = false;
var bluetoothSocketId = -1;
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
              serialConnected = true;
              port.postMessage({method:msg.method,connectionId:connectInfo.connectionId});
            }
        });
      }else if(msg.method=="disconnect"){
        chrome.serial.disconnect(msg.connectionId, function() {
            port.postMessage({method:msg.method});
            serialConnected = false;
        });
      }else if(msg.method=="send"){
        if(!serialConnected){
          return;
        }
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
    var interval;
    port.onMessage.addListener(function(msg) {
      if(msg.method=="list"){
        chrome.bluetooth.getDevices(function(devices){
            port.postMessage({method:"list",devices:devices});
        });
      }else if(msg.method=="discover"){
         chrome.bluetooth.stopDiscovery(function(){
           chrome.bluetooth.startDiscovery(function(){
            port.postMessage({method:"discover"});
          });
         });
      }else if(msg.method=="connect"){
        console.log("address:",msg.path)
        chrome.bluetoothSocket.create(function(createInfo) {
          var onConnectedCallback = function() {
            if (chrome.runtime.lastError) {
              console.log("Connection failed: " + chrome.runtime.lastError.message);
                port.postMessage({method:msg.method,connectionId:-1});
            } else {
                console.log("connection success:",createInfo)
                bluetoothConnected = true;
                port.postMessage({method:"connect",connectionId:createInfo.socketId});
            }
          };

          console.log("createInfo.socketId:",createInfo.socketId)
          bluetoothSocketId = createInfo.socketId;
          chrome.bluetoothSocket.connect(createInfo.socketId,msg.path, '1101', onConnectedCallback);
        });
      }else if(msg.method=="disconnect"){
        chrome.bluetoothSocket.close(msg.connectionId, function() {
            port.postMessage({method:"disconnect"});
            bluetoothConnected = false;
        });
      }else if(msg.method=="send"){
        if(!bluetoothConnected){
          return;
        }
        var len = msg.data.length;
        var bytes = new Uint8Array(len);
        for(var i=0;i<len;i++){
          bytes[i] = msg.data[i];
        }
        chrome.bluetoothSocket.send(bluetoothSocketId, bytes.buffer, function(sent) {
          if (chrome.runtime.lastError) {
            console.log("Send failed: " + chrome.runtime.lastError.message);
          } else {
            port.postMessage({method:"send",data:msg.data});
          }
        })
      }
    });
    

    chrome.bluetoothSocket.onReceive.addListener(function(res) {
      // if(res.socketId==createInfo.socketId){
        var bytes = new Uint8Array(res.data);
        var buffer = [];
        var len = bytes.length;
        for(var i=0;i<len;i++){
          buffer.push(bytes[i]);
        }
        if(len>0){
          scratchPort.postMessage({buffer:buffer});
          port.postMessage({event:"__DATA_RECEIVED__",data:buffer});
        }
      // }
    });
    chrome.bluetooth.onAdapterStateChanged.addListener(function(state){
      //state.discovering;
    })
    chrome.bluetooth.onDeviceAdded.addListener(function(device){
        port.postMessage({event:"__DEVICE_ADDED__",device:device});
    });
    chrome.bluetooth.onDeviceRemoved.addListener(function(device){
        port.postMessage({event:"__DEVICE_REMOVED__",device:device});
    });
    chrome.bluetooth.onDeviceChanged.addListener(function(device){
        port.postMessage({event:"__DEVICE_CHANGED__",device:device});
    });
    
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
              hidConnected = true;
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
            hidConnected = false;
        });
      }else if(msg.method=="send"){
        if(!hidConnected){
          return;
        }
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
