module.exports = {
    publish: function (data) {
      return publishInternal(data);
    }
  };


const mqtt = require('mqtt');
const log = require('electron-log');
const Settings = require('./Settings.js');


function publishInternal(testRunData) {
    log.info(testRunData);
    var baseTopic = "vocabulary/" + testRunData.user +
        "/english/vokabeln/" +
        testRunData.vData.fileName + "/";
    var noteTopic = baseTopic + "note";
    var gesamtTopic = baseTopic + "gesamt";
    var dauerTopic = baseTopic + "dauer";
    var fehlerTopic = baseTopic + "fehler";

    client = mqtt.connect('mqtt://mqtt.local');

    client.on('connect', function () {
        log.info("Publishing Grade " + testRunData.grade +" on " + noteTopic);
        client.publish(noteTopic, ""+testRunData.grade);

        log.info("Publishing Total " + testRunData.total);
        client.publish(gesamtTopic, ""+testRunData.total);

        log.info("Publishing Duraion " + testRunData.duration);
        client.publish(dauerTopic, ""+testRunData.duration);

        log.info("Publishing Error " + testRunData.error);
        client.publish(fehlerTopic, ""+testRunData.error);
    });
}

