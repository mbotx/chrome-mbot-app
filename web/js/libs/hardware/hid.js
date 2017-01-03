define(function (require) {
    function HID(){
        const self = this;
        const EventEmitter = require("../events/emitter.js");
        const DeviceEvent = require("../events/deviceevent.js");
        self.connectionId = -1;
        self.emitter = new EventEmitter();
        self.buffer = [];
        self.devices = [];
        self.list = function(){
            return new Promise(((resolve)=>{
                chrome.hid.getDevices({vendorId:0x0416,productId:0xffff},function(devices){
                    self.devices = devices.concat([]);
                    resolve(devices);
                });
            }));
        };
        self.connect = function(deviceId){
          return new Promise(((resolve)=>{
                chrome.hid.connect(deviceId, function(connectInfo) {
                    var suc = false;
                    if (!connectInfo) {
                    
                    }else{
                        if(self.connectionId==-1){
                        }
                        suc = true;
                        self.connectionId = connectInfo.connectionId;
                        self.poll();
                    }
                    resolve(suc);
                });
            }));
        };
        self.close = function(){
            return new Promise(((resolve)=>{
                chrome.hid.disconnect(self.connectionId, function() {
                    self.connectionId = -1;
                    resolve();
                });
            }));
        };
        self.poll = function(){
            if(self.connectionId!=-1){
                self.interval = setTimeout(self.poll,100);
                chrome.hid.receive(self.connectionId, function(reportId, data) {
                    var buffer = new Uint8Array(data);
                    var len = buffer[0];
                    if(len>0){
                      var output = [];
                      for(var i=0;i<len;i++){
                        output.push(buffer[i+1]);
                      }
                      self.emitter.emit(DeviceEvent.DATA_RECEIVED,output);
                    }
                    clearInterval(self.interval);
                    setTimeout(self.poll, 16);
                });
            }
        };
        self.send = function(buffer){
            return new Promise(((resolve)=>{
                chrome.hid.send(connectionId, 0, buffer, function() {
                    resolve();
                });
            }));
        };
        self.on = function(event,listener){
            self.emitter.on(event,listener);
        };
        
        self.list();
        
        chrome.hid.onDeviceAdded.addListener(function(device){
            console.log("added:",device);
            for(var i in self.devices){
              if(device.deviceId==self.devices[i].deviceId){
                return;
              }
            }
            self.devices.push(device);
            self.emitter.emit(DeviceEvent.UPDATE_DEVICES,self.devices);
        });
        chrome.hid.onDeviceRemoved.addListener(function(deviceId){
            console.log("removed:",deviceId);
            for(var i in self.devices){
              if(deviceId==self.devices[i].deviceId){
                self.devices.splice(i);
              }
            }
            self.emitter.emit(DeviceEvent.UPDATE_DEVICES,self.devices);
        });
    }
    return HID;
})