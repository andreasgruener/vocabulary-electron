module.exports = {
    publish: function (data) {
      return publishInternal(data);
    }
  };


const mqtt = require('mqtt');
const Settings = require('./Settings.js');


function publishInternal(testRunData) {
    var baseTopic = "/vocabulary/" +
        currentUser +
        "/english/Vokabeln/source/" +
        testRunData.file + "/";
    var noteTopic = baseTopic + "note";
    var gesamtTopic = baseTopic + "gesamt";
    var dauerTopic = baseTopic + "dauer";
    var fehlerTopic = baseTopic + "fehler";

    client = mqtt.connect('mqtt://mqtt.local');

    client.on('connect', function () {
        client.publish('presence', 'Hello mqtt');
    });
}

