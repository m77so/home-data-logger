'use strict';

const noble = require('@abandonware/noble');
const http = require('http');
const devices = {}
const InfluxDB = require( '@influxdata/influxdb-client')
const config = require("./config.json")

const send = (name, temp, humid, battery_mv, battery_lv, counter, rssi) => {
	const url = config.url
	const token = config.token
	const influxDB = new InfluxDB.InfluxDB({url, token})
	const writeApi = influxDB.getWriteApi(config.org, config.bucket)
	const p = new InfluxDB.Point('sample_measurement').tag('device', 'LYWSD03MMC').tag('id', name).floatField('temp', temp).floatField('humid', humid)
		.floatField('battery_mv', battery_mv)
		.floatField('battery_lv', battery_lv)
		.floatField('rssi', rssi)
	writeApi.writePoint(p)
	writeApi.close()
};

noble.on('stateChange', async (state) => {
    if (state === 'poweredOn') {
        await noble.startScanningAsync(['181a'], true);
    }
});
noble.on('discover', (peripheral) => {
    if (!peripheral.advertisement.localName || peripheral.advertisement.localName.startsWith('ATC') === false ) return;
    if (peripheral.advertisement.serviceData[0].uuid != '181a' ) return;
    const rssi = peripheral.rssi
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
    devices[name] = {name, temp, humid, battery_mv, battery_lv, counter, timestamp, rssi};
    console.log(name, temp, humid, battery_mv, battery_lv, counter, rssi, timestamp);
    send(name, temp, humid, battery_mv, battery_lv, counter, rssi);
});

