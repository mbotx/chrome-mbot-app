define(function (require) {
    function Bluetooth(){
        const self = this;
        const EventEmitter = require("../events/emitter.js");
        const DeviceEvent = require("../events/deviceevent.js");
        self.connectionId = -1;
        self.emitter = new EventEmitter();
        self.buffer = [];
        self.devices = [];
        self.device = null;
        self.port = chrome.runtime.connect({name: "bluetooth"});
        var i=0;

        function updateHandle(msg){
            switch(msg.event){
                case DeviceEvent.DEVICE_ADDED:{
                    for(i=0;i<self.devices.length;i++){
                        if(self.devices[i].address==msg.device.address){
                            return;
                        }
                    }
                    self.devices.push(msg.device);
                    self.emitter.emit(DeviceEvent.DEVICES_UPDATE,self.devices);
                }
                break;
                case DeviceEvent.DEVICE_REMOVED:{
                    for(i=0;i<self.devices.length;i++){
                        if(self.devices[i].address==msg.device.address){
                            self.devices.splice(i,1);
                        }
                    }
                    self.emitter.emit(DeviceEvent.DEVICES_UPDATE,self.devices);
                }
                break;
                case DeviceEvent.DEVICE_CHANGED:{
                  if(msg.devices){
                    for(i=0;i<self.devices.length;i++){
                        if(self.devices[i].address==msg.devices[0].address){
                            self.devices[i] = msg.devices[0];
                        }
                    }
                    self.emitter.emit(DeviceEvent.DEVICES_UPDATE,self.devices);
                  }
                }
                break;
                case DeviceEvent.DATA_RECEIVED:{
                    self.emitter.emit(DeviceEvent.DATA_RECEIVED,msg.data);
                }
                break;
                case DeviceEvent.COMMAND_RECEIVED:{
                    var data = msg.data;
                    self.send(data);
                }
                break;
            }
        }
        self.port.onMessage.addListener(updateHandle);
        self.discover = function(){
          return new Promise(((resolve)=>{
                function received(msg){
                    self.port.onMessage.removeListener(received);
                    resolve();
                }
                self.port.onMessage.addListener(received);
                self.port.postMessage({method:"discover"});
            }));
        }
        self.list = function(){
            return new Promise(((resolve)=>{
                function received(msg){
                    self.port.onMessage.removeListener(received);
                    self.devices = msg.devices;
                    resolve(msg.devices);
                }
                self.port.onMessage.addListener(received);
                self.port.postMessage({method:"list"});
            }));
        };
        self.connect = function(path){
          return new Promise(((resolve)=>{
              function received(msg){
                  self.port.onMessage.removeListener(received);
                  var suc = false;
                  if(msg.connectionId){
                    suc = msg.connectionId>-1;
                  }else if(msg.device){
                    self.device = msg.device;
                    suc = self.device.connected;
                  }
                  resolve(suc);
              }
              self.port.onMessage.addListener(received);
              self.port.postMessage({method:"connect",path:path});
            }));
        };
        self.disconnect = function(){
            return new Promise(((resolve)=>{
              function received(msg){
                  self.port.onMessage.removeListener(received);
                  self.connectionId = -1;
                  resolve();
              }
              self.port.onMessage.addListener(received);
              if(self.connectionId>-1){
                self.port.postMessage({method:"disconnect",connectionId:self.connectionId});
              }else{
                resolve();
              }
            }));
        };
        self.send = function(data){
            return new Promise(((resolve)=>{
                function received(){
                  self.port.onMessage.removeListener(received);
                  resolve();
              }
              self.port.onMessage.addListener(received);
              self.port.postMessage({method:"send",connectionId:self.connectionId,data:data});
            }));
        };
        self.on = function(event,listener){
            self.emitter.on(event,listener);
        };
        
        self.list();
        /**/
    }
    return Bluetooth;
});
/**
 * console.log("init");
var devicesCount = 0;
var hidEnabled = false;
var hidConnection;
var serialConnection;
var btConnection;
var isFirst = true;
function initBT(){
  var msg = {};
  msg.action = 'initBT';
  chrome.bluetooth.getDevices(function (deviceInfos){
    console.log(deviceInfos);
    msg.devices = deviceInfos;
    sendMessage(msg);
  });
  
}
function initHID(){
  var msg = {};
  msg.action = 'initHID';
  chrome.hid.getDevices({vendorId:0x0416,productId:0xffff},function(devices){
    if (chrome.runtime.lastError) {
      console.log("Unable to enumerate devices: " +
                    chrome.runtime.lastError.message);
      msg.deviceId = '';
      sendMessage(msg);
    }else{
      devicesCount = devices.length;
      if(devicesCount>0){
        msg.deviceId = devices[0].deviceId;
        msg.productName = devices[0].productName;
        msg.devices = devices;
        sendMessage(msg);
      }
    }
  });
  if(isFirst){
    isFirst = false;
    chrome.hid.onDeviceAdded.addListener(onDeviceAdded);
    chrome.hid.onDeviceRemoved.addListener(onDeviceRemoved);
    chrome.bluetoothSocket.onReceive.addListener(onBTReceived);
  }
}
function initSerial(){
  var msg = {};
  msg.action = 'initSerial';
  chrome.serial.getDevices(function(devices){
    if (chrome.runtime.lastError) {
      console.log("Unable to enumerate devices: " +
                    chrome.runtime.lastError.message);
      msg.devices = [];
      sendMessage(msg);
    }else{
      msg.devices = devices;
      sendMessage(msg);
    }
  });
}
function connectBT(address){
  var msg = {};
  msg.action = 'connectBT';
  chrome.bluetoothSocket.create(function(createInfo) {
  chrome.bluetoothSocket.connect(createInfo.socketId,
    address, '1101', function(){
      if (chrome.runtime.lastError) {
        console.log("Connection failed: " + chrome.runtime.lastError.message);
          msg.status = false;
      } else {
        btConnection = createInfo.socketId;
          msg.status = true;
      }
          sendMessage(msg);
    });
});
}

function onBTReceived(info){
  onParseSerial(new Uint8Array(info.data));
}
function connectHID(deviceId){
  var msg = {};
  msg.action = 'connectHID';
  chrome.hid.connect(deviceId*1, function(connectInfo) {
        if (!connectInfo) {
          msg.warn = connectInfo;
          msg.status = false;
          sendMessage(msg);
        }else{
          if(!hidConnection){
            hidConnection = connectInfo.connectionId;
            pollForHID();
          }
          console.log("hid connected:",hidConnection);
          msg.status = true;
          sendMessage(msg);
        }
      });
}
function connectSerial(deviceId){
  var msg = {};
  msg.action = 'connectSerial';
  chrome.serial.connect(deviceId, {bitrate: 115200}, function(connectInfo) {
        if (!connectInfo) {
          msg.warn = connectInfo;
          msg.status = false;
          sendMessage(msg);
        }else{
          if(!serialConnection){
            serialConnection = connectInfo.connectionId;
            chrome.serial.onReceive.addListener(onSerialReceived);
          }
          console.log("serial connected:",serialConnection);
          msg.status = true;
          sendMessage(msg);
        }
      });
}
function onSerialReceived(info){
  onParseSerial(new Uint8Array(info.data));
}
function disconnectBT(){
  var msg = {};
  msg.action = 'connectBT';
  chrome.bluetoothSocket.disconnect(btConnection, function (){
          msg.status = false;
          btConnection = null;
          sendMessage(msg);
  });
}
function disconnectHID(deviceId){
  var msg = {};
  msg.action = 'connectHID';
  chrome.hid.disconnect(hidConnection, function() {
          msg.status = false;
          hidConnection = null;
          sendMessage(msg);
      });
}
function disconnectSerial(deviceId){
  var msg = {};
  msg.action = 'connectSerial';
  chrome.serial.disconnect(serialConnection, function() {
          msg.status = false;
          serialConnection = null;
          sendMessage(msg);
      });
}
function sendMessage(msg){
  chrome.runtime.sendMessage(msg,function(response){
    console.log("response:",response);
  });
}
function sendBT(buffer){
  var bytes = new Uint8Array(buffer.length);
  for(var i=0;i<buffer.length;i++){
    bytes[i] = buffer[i];
  }
  chrome.bluetoothSocket.send(btConnection, bytes.buffer, function(bytes_sent) {
    if (chrome.runtime.lastError) {
      console.log("Send failed: " + chrome.runtime.lastError.message);
    } else {
      console.log("Sent " + bytes_sent + " bytes");
    }
  });
}
function sendHID(buffer){
    var bytes = new Uint8Array(buffer.length);
    for(var i=0;i<buffer.length;i++){
      bytes[i] = buffer[i];
    }
    // ui.send.disabled = true;
    chrome.hid.send(hidConnection, 0, bytes.buffer, function() {
    //   ui.send.disabled = false;
    });
}
function sendSerial(buffer){
    var bytes = new Uint8Array(buffer.length);
    for(var i=0;i<buffer.length;i++){
      bytes[i] = buffer[i];
    }
    // ui.send.disabled = true;
    chrome.serial.send(serialConnection, bytes.buffer, function() {
    //   ui.send.disabled = false;
    });
}
function pollForHID(){
  chrome.hid.receive(hidConnection, function(reportId, data) {
      onParse(new Uint8Array(data));
      setTimeout(pollForHID, 16);
    });
}
function onBTReceived(receiveInfo) {
  if (receiveInfo.socketId == btConnection){
    onParseSerial(new Uint8Array(receiveInfo.data));
  }
    
}
chrome.runtime.onConnectExternal.addListener(onConnected);
chrome.runtime.onMessageExternal.addListener(onMessageExternal);
chrome.runtime.onMessage.addListener(onMessage);
console.log(chrome.runtime.id);
function onMessage(request, sender, sendResponse) {
  if(request.action=="initSerial"){
    initSerial();
  }else if(request.action=="initHID"){
    initHID();
  }else if(request.action=="initBT"){
    initBT();
  }else if(request.action=="connectBT"){
    connectBT(request.address);
  }else if(request.action=="connectHID"){
    connectHID(request.deviceId*1);
  }else if(request.action=="disconnectBT"){
    disconnectBT();
  }else if(request.action=="disconnectHID"){
    disconnectHID(request.deviceId*1);
  }else if(request.action=="connectSerial"){
    connectSerial(request.deviceId);
  }else if(request.action=="disconnectSerial"){
    disconnectSerial(request.deviceId);
  }
  var resp = {};
  resp.request = request;
  sendResponse(resp);
}
function onMessageExternal(request, sender, sendResponse) {
    var resp = {};
    if(hidConnection===null&&serialConnection===null&&btConnection===null){
      resp.status = false;
      sendResponse(resp);
    }else{
      resp.status = true;
      sendResponse(resp);
    }
}
var currentPort = null;
function onConnected(port){
  console.log("onConnected:",port);
  if(currentPort!==null){
    currentPort.onMessage.removeListener(onPortMessage);
    currentPort.disconnect();
  }
  currentPort = port;
  currentPort.onMessage.addListener(onPortMessage);
}

function onParseSerial(buffer){
    var msg = {};
    msg.buffer = [];
    for(var i=0;i<buffer.length;i++){
      msg.buffer[i] = buffer[i];
    }
    postMessage(msg);
}
function onParse(buffer){
  if(buffer[0]>0){
    var msg = {};
    msg.buffer = [];
    for(var i=0;i<buffer[0];i++){
      msg.buffer[i] = buffer[i+1];
    }
    postMessage(msg);
  }
}
function postMessage(msg){
  currentPort.postMessage(msg);
}
function onPortMessage(msg){
  if(hidConnection){
    sendHID(msg.buffer);
  }
  if(serialConnection){
    sendSerial(msg.buffer);
  }
  if(btConnection){
    sendBT(msg.buffer);
  }
}
function onDeviceAdded(device){
  //HidDeviceInfo 
  console.log("added:"+device);
  var msg = {};
  msg.action = "addHID";
  msg.deviceId = device.deviceId;
  msg.productName = device.productName;
  sendMessage(msg);
}
function onDeviceRemoved(device){
  console.log("removed:"+device);
}
 */