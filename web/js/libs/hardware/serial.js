define(function (require) {
  function Serial(){
    const self = this;
    self.connectionId = -1;
    const EventEmitter = require("../events/emitter.js");
    self.emitter = new EventEmitter();
    self.devices = [];
    self.list = function(){
      return new Promise(((resolve)=>{
        chrome.serial.getDevices(function(ports){
          var filters = [];
          for(var i in ports){
            if(ports[i].path.toLowerCase().indexOf("bluetooth")==-1&&ports[i].path.toLowerCase().indexOf("cu.")==-1){
              filters.push(ports[i]);
            }
          }
          resolve(filters);
        });
      }));
    };
    self.connect = function(path,baudrate){
      return new Promise(((resolve)=>{
        chrome.serial.connect(path,{bitrate:baudrate},function(connectionInfo){
          self.connectionId = connectionInfo.connectionId;
          resolve(self.connectionId);
        });
      }));
    };
    self.send = function(){
      return new Promise(((resolve)=>{
        chrome.serial.send(connectionId, 0, buffer, function() {
          resolve();
        });
      }));
    }
    self.on = function(event,listener){
      self.emitter.on(event,listener);
    };
  }
  return Serial;
});