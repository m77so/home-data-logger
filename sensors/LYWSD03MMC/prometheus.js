'use strict';

const noble = require('@abandonware/noble');
const http = require('http');
const devices = {}
noble.on('stateChange', async (state) => {
    if (state === 'poweredOn') {
        await noble.startScanningAsync(['181a'], true);
    }
});
noble.on('discover', (peripheral) => {
    if (!peripheral.advertisement.localName || peripheral.advertisement.localName.startsWith('ATC') === false ) return;
    if (peripheral.advertisement.serviceData[0].uuid != '181a' ) return;
    const data = (peripheral.advertisement.serviceData[0].data);
    const name = peripheral.advertisement.localName;
    const temp = (data.readInt16LE(6)) / 100;
    const humid = (data.readUInt16LE(8)) / 100;
    const battery_mv  = (data.readUInt16LE(10));
    const battery_lv = (data.readUInt8(11));
    const counter = (data.readUInt8(12));
    const timestamp = +new Date();
    if (!(name in devices)) {
        devices[name] = {}
    }
    devices[name] = {name, temp, humid, battery_mv, battery_lv, counter, timestamp};
    console.log(name, temp, humid, battery_mv, battery_lv, counter, timestamp);
});

const svr = http.createServer(function( req, res) {

    res.writeHead(200, {'Content-Type': 'text/plain'});
    let res_arr = [
        '#HELP home_temperature 気温',
        '#TYPE home_temperature gauge',
        '#HELP home_humidity 湿度',
        '#TYPE home_humidity gauge',
        '#HELP home_sensor_battery_lv バッテリー残量',
        '#TYPE home_sensor_battery_lv gauge',
    ];
    Object.values(devices).forEach(d=>{
        res_arr.push(`home_temperature{device="${d.name}"} ${d.temp} ${d.timestamp}`)
        res_arr.push(`home_humidity{device="${d.name}"} ${d.humid} ${d.timestamp}`)
        res_arr.push(`home_sensor_battery_lv{device="${d.name}"} ${d.battery_lv} ${d.timestamp}`)
    })
    res.end(res_arr.map(l=>`${l}\n`).join(''))
		
});
svr.timeout = 10000;
svr.listen(8000);