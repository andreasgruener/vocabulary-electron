module.exports = {
    publish: function (data) {
        return publishInternal(data);
    }
};


const mqtt = require('mqtt');
const log = require('electron-log');
const Settings = require('./Settings.js');


//  vocabulary/<USER>/<LANGUAGE>/<TYPE>/<SUBTYPE>/<SUBSUBTYPE>/<TOTAL>/<ERROR>/<DURARION_SECONDS>/<GRADE>
//  vocabulary/<USER>/<LANGUAGE>/<TYPE>/<SUBTYPE>/<TOTAL>/<ERROR>/<DURARION_SECONDS>/<GRADE>
// vocabulary/anton/english/foreign/unit3.csv/30/2/500/3.5

function publishInternal(testRunData) {
 //   log.info(testRunData);

    var topic = "vocabulary/" +
        testRunData.user + "/" +
        testRunData.language +  "/" +
        testRunData.type +  "/" +
        testRunData.fileName +  "/" +
        testRunData.targetCount +  "/" +
        testRunData.error +  "/" +
        testRunData.duration +  "/" +
        testRunData.grade;
    var server = "mqtt://10.0.2.2"; // Settings.MQTT_SERVER;
   
   
    log.info("Connecting to " + server);
    client = mqtt.connect(server);
    client.on('connect', function () {
        log.info("Publishing Grade " + testRunData.grade + " on " + topic + "@" + this.server);
        client.publish(topic, "" + testRunData.grade);
        client.end();
        
    });
}