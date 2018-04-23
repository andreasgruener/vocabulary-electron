module.exports = {
    publish: function (data) {
        return publishInternal(data);
    }
};


const mqtt = require('mqtt');
const log = require('electron-log');
const Settings = require('./Settings.js');


//  vocabulary/<USER>/<LANGUAGE>/<TYPE>/<SUBTYPE>/<SUBSUBTYPE>/<TOTAL>/<ERROR>/<DURARION_SECONDS>/<GRADE>
//  vocabulary/<USER>/<LANGUAGE>/<TYPE>/<TOTAL>/<ERROR>/<DURARION_SECONDS>/<GRADE>
// vocabulary/anton/english/foreign/30/2/500/3.5

function publishInternal(testRunData) {
    log.info(testRunData);

    var topic = "vocabulary/" +
        testRunData.user + "/" +
        testRunData.language +  "/" +
        testRunData.type +  "/" +
        testRunData.targetCount +  "/" +
        testRunData.error +  "/" +
        testRunData.duration +  "/" +
        testRunData.grade;

   
    client = mqtt.connect('mqtt://mqtt.local');

    client.on('connect', function () {
        log.info("Publishing Grade " + testRunData.grade + " on " + topic);
        client.publish(topic, "" + testRunData.grade);

        
    });
}