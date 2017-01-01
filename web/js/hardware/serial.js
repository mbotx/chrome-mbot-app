function Serial(){
  const self = this;
  self.connectionId = -1;
  self.emitter = new EventEmitter();
  self.list = function(){
    return new Promise(((resolve)=>{
      chrome.serial.getDevices(function(ports){
        resolve(ports);
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
  self.on = function(event,listener){
    self.emitter.on(event,listener);
  };
}
module.exports = Serial;