define(function (require) {
    function HID(){
        const self = this;
        const EventEmitter = require("../events/emitter.js");
        const DeviceEvent = require("../events/deviceevent.js");
        self.connectionId = -1;
        self.emitter = new EventEmitter();
        self.buffer = [];
        self.devices = [];
        self.port = chrome.runtime.connect({name: "hid"});
        function updateHandle(msg){
            switch(msg.event){
                case DeviceEvent.DEVICE_ADDED:{
                    for(var i in self.devices){
                        if(self.devices[i].deviceId==msg.device.deviceId){
                            return;
                        }
                    }
                    self.devices.push(msg.device);
                    self.emitter.emit(DeviceEvent.DEVICES_UPDATE,self.devices);
                }
                break;
                case DeviceEvent.DEVICE_REMOVED:{
                    for(var i in self.devices){
                        if(self.devices[i].deviceId==msg.deviceId){
                            self.devices.splice(i,1);
                        }
                    }
                    self.emitter.emit(DeviceEvent.DEVICES_UPDATE,self.devices);
                }
                break;
                case DeviceEvent.DATA_RECEIVED:{
                    self.emitter.emit(DeviceEvent.DATA_RECEIVED,{});
                }
                break;
            }
        }
        self.port.onMessage.addListener(updateHandle);
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
        /**/
    }
    return HID;
});