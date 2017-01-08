define(function (require) {
    function Serial(){
        const self = this;
        const EventEmitter = require("../events/emitter.js");
        const DeviceEvent = require("../events/deviceevent.js");
        self.connectionId = -1;
        self.emitter = new EventEmitter();
        self.buffer = [];
        self.devices = [];
        self.port = chrome.runtime.connect({name: "serial"});
        var i=0;
        function updateHandle(msg){
            switch(msg.event){
                case DeviceEvent.DATA_RECEIVED:{
                    self.emitter.emit(DeviceEvent.DATA_RECEIVED,msg.data);
                }
                break;
                case DeviceEvent.COMMAND_RECEIVED:{
                    var data = msg.data;
                    //data.splice(0,1);
                    self.send(data);
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
        self.connect = function(path){
          return new Promise(((resolve)=>{
              function received(msg){
                  self.port.onMessage.removeListener(received);
                  self.connectionId = msg.connectionId;
                  var suc = self.connectionId>-1;
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
    return Serial;
});