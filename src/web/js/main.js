define(function(require) {
    const Serial = require("./libs/hardware/serial.js");
    const HID = require("./libs/hardware/hid.js");
    const Bluetooth = require("./libs/hardware/bluetooth.js");
    const DeviceEvent = require("./libs/events/deviceevent.js");
    const Vue = require("./libs/ui/vue.js");
    // var port = new Serial();
    // port.list().then(function(ports){
    //     console.log("serial ports:",ports);
    // });
    //
    //
    console.log("id:", chrome.runtime.id);
    const self = this;
    var hid = new HID();
    var serial = new Serial();
    var bluetooth = new Bluetooth();
    var app = new Vue({
            el: '#app',
            data: {
                logo: "./assets/logo.png",
                mbot: "./assets/mBot.jpg"
            },
            methods: {
                mbotSelected: function() {
                    console.log("mbot");
                },
                rangerSelected: function() {
                    console.log("ranger");
                }
            }
        });
    var hidSelector = new Vue({
            el: '#hid-devices',
            data: {
                selected: '',
                options: []
            },
            methods: {
                connect: function(e) {
                    if (hid.connectionId > -1) {
                        hid.disconnect().then(function() {
                            e.target.innerHTML = "Conectar";
                        });
                    } else {
                        hid.connect(this.selected).then(function(suc) {
                            e.target.innerHTML = (suc ? "Desconectar" : "Conectar");
                        });
                    }
                }
            }
        });
    var serialSelector = new Vue({
            el: '#serial-devices',
            data: {
                selected: '',
                options: []
            },
            methods: {
                connect: function(e) {
                    if (serial.connectionId > -1) {
                        serial.disconnect().then(function() {
                            e.target.innerHTML = "Conectar";
                        });
                    } else {
                        serial.connect(this.selected).then(function(suc) {
                            console.log("serial connected:", suc);
                            e.target.innerHTML = (suc ? "Desconectar" : "Conectar");
                        });
                    }
                }
            }
        });

    var bluetoothSelector = new Vue({
            el: '#bluetooth-devices',
            data: {
                selected: '',
                options: []
            },
            methods: {
                connect: function(e) {
                    if (bluetooth.connectionId > -1) {
                        bluetooth.disconnect().then(function() {
                            e.target.innerHTML = "Conectar";
                        });
                    } else {
                        bluetooth.connect(this.selected).then(function(suc) {
                            console.log("bluetooth connected:", suc);
                            e.target.innerHTML = (suc ? "Desconectar" : "Conectar");
                        });
                    }
                },
                discover: function(e) {
                    bluetooth.discover();
                }
            }
        });
    var scratchPanel = new Vue({
            el: "#scratch-x-panel",
            methods: {
                openProject: function() {
                    window.open('http://scratchx.org/?url=http://gabrielcbe.github.io/scratchx-mbot/makeblock-app.js#scratch');
                },
                refresh: function() {
                    updateSerial();
                    updateHID();
                    bluetooth.discover();
                }
            }
        });

    function updateSerial() {
        serial.list().then(function(devices) {
            updateSerialList(devices);
        });
    }

    function updateHID() {
        hid.list().then(function(devices) {
            updateHIDList(devices);
        });
    }

    function updateBluetooth() {
        bluetooth.list().then(function(devices) {
            updateBluetoothList(devices);
        });
    }
    updateSerial();
    updateHID();
    updateBluetooth();
    hid.on(DeviceEvent.DEVICES_UPDATE, function(devices) {
        updateHIDList(devices);
    });
    bluetooth.on(DeviceEvent.DEVICES_UPDATE, function(devices) {
        updateBluetoothList(devices);
    });

    function updateHIDList(devices) {
        var options = [];
        for (var i = 0; i < devices.length; i++) {
            options.push({
                    text: devices[i].productName,
                    value: devices[i].deviceId
                });
        }
        hidSelector._data.options = options;
        if (options.length > 0) {
            hidSelector._data.selected = options[0].value;
        }
    }

    function updateSerialList(devices) {
        var options = [];
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].path.indexOf("cu") > -1) continue;
            options.push({
                    text: devices[i].path,
                    value: devices[i].path
                });
        }
        serialSelector._data.options = options;
        if (options.length > 0) {
            serialSelector._data.selected = options[0].value;
        }
    }

    function updateBluetoothList(devices) {
        var options = [];
        for (var i = 0; i < devices.length; i++) {
            options.push({
                    text: devices[i].name + "(" + devices[i].address + ")",
                    value: devices[i].address
                });
        }
        bluetoothSelector._data.options = options;
        if (options.length > 0) {
            bluetoothSelector._data.selected = options[0].value;
        }
    }
});

function onRefreshHardware() {
    var msg = {};
    msg.action = "initHID";
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("initHID:", response);
        msg.action = "initSerial";
        chrome.runtime.sendMessage(msg, function(response) {
            console.log("initSerial:", response);
            msg.action = "initBT";
            chrome.runtime.sendMessage(msg, function(response) {
                console.log("initBT:", response);
            });
        });
    });

}

function onConnectHID() {
    var msg = {};
    msg.action = document.getElementById('connectHID').innerHTML == "Conectar" ? "connectHID" : "disconnectHID";
    msg.deviceId = document.getElementById('hid-device-selector').options[document.getElementById('hid-device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("hid:", response);
    });
}

function onConnectSerial() {
    var msg = {};
    msg.action = document.getElementById('connectSerial').innerHTML == "Conectar" ? "connectSerial" : "disconnectSerial";
    msg.deviceId = document.getElementById('serial-device-selector').options[document.getElementById('serial-device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("serial:", response);

    });
}

function onConnectBT() {
    var msg = {};
    msg.action = document.getElementById('connectBT').innerHTML == "Conectar" ? "connectBT" : "disconnectBT";
    msg.address = document.getElementById('bt-device-selector').options[document.getElementById('bt-device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("bt:", response);
    });
}

function onMessage(request, sender, sendResponse) {
    var option, i;
    if (request.action == "initHID") {
        if (request.deviceId !== '') {
            console.log(request.devices);
            option = document.createElement('option');
            option.text = request.productName + " #" + request.deviceId;
            option.id = request.deviceId;
            document.getElementById('hid-device-selector').options.length = 0;
            document.getElementById('hid-device-selector').options.add(option);
        }
    } else if (request.action == "addHID") {
        if (request.deviceId !== '') {
            option = document.createElement('option');
            option.text = request.productName + " #" + request.deviceId;
            option.id = request.deviceId;
            document.getElementById('hid-device-selector').options.add(option);
        }
    } else if (request.action == "initBT") {
        document.getElementById('bt-device-selector').options.length = 0;
        console.log(request.devices);
        if (request.devices.length > 0) {
            for (i = 0; i < request.devices.length; i++) {
                option = document.createElement('option');
                option.text = "" + request.devices[i].name + " ( " + request.devices[i].address + " )";
                option.id = request.devices[i].address;
                document.getElementById('bt-device-selector').options.add(option);
            }
        }
    } else if (request.action == "initSerial") {
        document.getElementById('serial-device-selector').options.length = 0;
        if (request.devices.length > 0) {
            for (i = 0; i < request.devices.length; i++) {
                option = document.createElement('option');
                option.text = "" + request.devices[i].path + (request.devices[i].displayName ? " " + request.devices[i].displayName : "");
                option.id = request.devices[i].path;
                document.getElementById('serial-device-selector').options.add(option);
            }
        }
    } else if (request.action == "connectHID") {
        document.getElementById('connectHID').innerHTML = request.status ? 'Desconectar' : 'Conectar';
    } else if (request.action == "connectBT") {
        document.getElementById('connectBT').innerHTML = request.status ? 'Desconectar' : 'Conectar';
    } else if (request.action == "connectSerial") {
        console.log(request.action, request);
        document.getElementById('connectSerial').innerHTML = request.status ? 'Desconectar' : 'Conectar';
    }
    var resp = {};
    resp.request = request;
    sendResponse(resp);
}
window.onload = function() {
    document.getElementById('openscratchx').addEventListener('click', onOpenScratchX);
    document.getElementById('connectHID').addEventListener('click', onConnectHID);
    document.getElementById('connectSerial').addEventListener('click', onConnectSerial);
    document.getElementById('connectBT').addEventListener('click', onConnectBT);
    document.getElementById('refresh').addEventListener('click', onRefreshHardware);
    chrome.runtime.onMessage.addListener(onMessage);
    onRefreshHardware();
};
