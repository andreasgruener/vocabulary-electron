module.exports = {
    publish: function (data) {
      return publishInternal(data);
    }
  };


const mqtt = require('mqtt');


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

// "language": "Englisch",
// "user": "greta",
// "type": "Vokabeln",
// "subtype": "source",
// "subsubtype": "Unit3-neu.csv",
// "version": "1.2",
// "fehler": 4,
// "created": "2018-03-01T09:24:29Z"
//
// fehler
// gesamt
// dauer
// note
//
// /vocabulary/anton/latein/deklinieren/a-Deklination/pauken/note
// /

