const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const parse = require('csv-parse')
const Store = require('./store.js');
const log = require('electron-log');
const mqtt = require('mqtt');
const username = require('username');
var currentUser = "unknown";
username().then(username => {
    currentUser = username;
});
var mail = require('./assets/js/Mail.js');
const { app, BrowserWindow, Menu, dialog, ipcMain } = electron;

var activeVocabulary;



var testRunData;
var fileInfo;
// SET ENVIRONMENT
//process.env.NODE_ENV = 'production';

let mainWindow;
let addWindow;

// First instantiate the class
const store = new Store({
    // We'll call our data file 'user-preferences'
    configName: 'user-preferences',
    defaults: {
        // 800x600 is the default size of our window
        windowBounds: { width: 1280, height: 800 },
        windowPositionX: 300,
        windowPositionY: 300,
        vocabularyFileName: ''
    }
});

// Listen for app to be ready

app.on('ready', function () {
    // create new window
    let { width, height } = store.get('windowBounds');
    let x = store.get('windowPositionX');
    let y = store.get('windowPositionY');

    log.info("Loaded pos %s, %s", x, y);
    // Pass those values in to the BrowserWindow options
    mainWindow = new BrowserWindow({ width, height });
    if (x) {
        mainWindow.setPosition(x, y);
    }
    else {
        log.debug("No stored Window position.")
    }
    //load html into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file',
        slashes: true
    }));
    // Quit App when closed ((X))
    mainWindow.on('closed', function () { app.quit() });

    // The BrowserWindow class extends the node.js core EventEmitter class, so we use that API
    // to listen to events on the BrowserWindow. The resize event is emitted when the window size changes.
    mainWindow.on('resize', () => {
        store.set('windowBounds', { width, height });
    });

    mainWindow.on('moved', () => {
        store.set('windowPositionX', mainWindow.getPosition()[0]);
        store.set('windowPositionY', mainWindow.getPosition()[1]);
    });

    // build Menu from templatew
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert menu


    Menu.setApplicationMenu(mainMenu);
    log.info('Dear %s, yeah. I am ready!', currentUser);
    // loadLastFile();

    // publish();
});

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

function publish() {
    var baseTopic = "/vocabulary/" +
        currentUser +
        "/english/Vokabeln/source/" +
        testRunData.file + "/";
    var noteTopic = baseTopic + "note";
    var gesamtTopic = baseTopic + "gesamt";
    var dauerTopic = baseTopic + "dauer";
    var fehlerTopic = baseTopic + "fehler";

    client = mqtt.connect('mqtt://mqtt.local')

    client.on('connect', function () {
        client.publish('presence', 'Hello mqtt')
    })
}




function loadLastFile() {
    var lastFile = store.get('vocabularyFileName');

    if (lastFile !== '') {
        log.info('Loading last file %s', lastFile);
        parseCSV(lastFile);
    } else {
        log.info('No file to load %s', lastFile);
    }
}


// load CSV File
function loadCSVFile() {
    log.info("Opening Dialog ..");

    dialog.showOpenDialog(//{properties: ['openFile', 'openDirectory', 'multiSelections']});
        {
            filters: [
                { name: 'Vocabulary Files CSV', extensions: ['csv'] }
            ]
        }, function (fileNames) {
            if (fileNames === undefined) return;

            const fileName = fileNames[0];
            const fileDir = path.parse(fileName).dir;
            log.info(fileDir);

            parseCSV(fileName);

        });
}


// load CSV File
function loadCSVFile() {
    log.info("Opening Dialog ..");

    dialog.showOpenDialog(//{properties: ['openFile', 'openDirectory', 'multiSelections']});
        {
            filters: [
                { name: 'Vocabulary Files CSV', extensions: ['csv'] }
            ]
        }, function (fileNames) {
            if (fileNames === undefined) return;

            const fileName = fileNames[0];
            const fileDir = path.parse(fileName).dir;
            log.info(fileDir);

            parseCSV(fileName);

        });
}

// parse csv
function parseCSV(fileName) {
    log.info("About to load" + fileName);

    fs.readFile(fileName, 'utf-8', function (err, data) {
        if (err) return log.info("parseCSV:", err);
        // data is the contents of the text file we just read
        //  log.info(data);

        parse(data, {
            delimiter: ';',
            relax_column_count: true,
            columns: ['word', 'translation', 'genus']
        }, function (err, output) {
            //  log.info("****** Parsed Start:")
            //  log.info(err);
            // log.info(output);
            //  log.info("****** Parsed End")

            // special handling for our format
            result = specialParse(output);
            activeVocabulary = result.voc;

            const file = path.parse(fileName).name + path.parse(fileName).ext;
            result['fileName'] = fileName;
            result['file'] = file;
            result['size'] = activeVocabulary.length;

            log.info("****** Parsed End");
            fileLoaded(result)
        });

        // mainWindow.webContents.
    });
}


function specialParse(data) {
    var result = {};
    var vocs = [];
    var parseProblems = [];
    for (var i = 0; i < data.length; i++) {
        var entry = {};
        var parseError = {};
        var word = data[i].word;
        var translation = data[i].translation;
        // latin
        if (word.indexOf('|') >= 0) {
            word = word.split("|")[0];
        }
        if (word.indexOf(':') >= 0) {
            word = word.split(":")[0];
        }
        if (translation) {
            if (translation.indexOf(':') >= 0) {
                translation = translation.split(":")[0];
            }
        }
        else {
            log.info("Translation is missing for %s", word);
            translation = "MISSING";
            parseError['word'] = word;
            parseError['error'] = "Missing Translation, no semicolon"
            parseError['raw'] = data[i].word;
            parseError['row'] = i;

            parseProblems.push(parseError);
        }
        entry['word'] = word;
        entry['translation'] = translation;
        //     log.info(entry);
        vocs.push(entry);
    }
    // log.info('**************');
    //   log.info(vocs);
    result['voc'] = vocs;
    result['parseErrors'] = parseProblems;
    return result;
}

function fileLoaded(result) {
    log.info("[MAIN] fileLoaded %s Words:%s", result.file, result.size);
    // store globally
    testRunData = {
        'error': 0,
        'total': result.size,
        'correct': 0,
        'currentIndex': 0,  // index to ask
        'word': '<No Data>',  // the word to ask
        'correctTranslation': '<No Data>',  // the translation at index
        'answerIsCorrect': false,  // used to check if the answer is correct
        'currentCount': 0, // counter for current run
        'grade': 0, // initial grade
        'targetCount': 0,  // target counter for this run
        'type': '<No Data>',
        'started' : "jetzt",
        'fileName': result.fileName,
        'parseErrors': result.parseErrors,
        'file': result.file,
        'size': result.size
    }
    //log.debug(stats.fil);
    // store last file if it was read successfull
    store.set('vocabularyFileName', result.fileName);
    sendStats();
}


function initRun(count, type) {
    testRunData.targetCount = 10; // all is default
    if (count < testRunData.targetCount)
        testRunData.targetCount = count;
    testRunData.correct = 0;
    testRunData.error = 0;
    testRunData.currentIndex = 0;
    testRunData.currentCount = 0;
    testRunData.word = "";
    // type not 
}

function checkVocabulary(check) {
    log.info("# Ready to check %s = %s.", check.word, check.translation);
    for (var i = 0; i < activeVocabulary.length; i++) {
        var entry = activeVocabulary[i];
        //log.info("Checking %s with %s", entry.word, entry.translation);
        //log.info("")
        if (entry.word == check.word) {
            log.info("# Found %s", entry.word);
            if (entry.translation == check.translation) {
                log.info("# Found %s", entry.word);
                incrementVocabularyStatsCorrect();
                return "OK";
            } else {
                log.info("# Wrong translation for %s correct is %s", entry.word, entry.translation);
                incrementVocabularyStatsError(entry);
                return entry.word + " --> " + entry.translation;
            }
        }
    }
    return "Unknown Vocabulary " + check.word;
}

function nextVocabulary() {
    console.log(testRunData);
    log.info("Next vocabulary %s", testRunData.currentIndex);
    testRunData.currentIndex = testRunData.currentIndex + 1;
    if (testRunData.currentIndex > testRunData.targetCount) {
        log.info("Test over");
        calcGrade();
        mail.sendMail(testRunData);
        log.info("MAIL SEND -- Test over");
        mainWindow.webContents.send("test:over", testRunData);
    } else {
        var entry = activeVocabulary[testRunData.currentIndex];
        testRunData.word = entry.word;
        mainWindow.webContents.send("test:display", testRunData);
        log.info("Test Display");
    }
}


function setTargetCount(targetCount) {
    testRunData.targetCount = targetCount;
}

function incrementVocabularyStatsCorrect() {
    testRunData.correct += 1;
    testRunData.currentCount += 1;
    testRunData.correctTranslation = '';
    testRunData.answerIsCorrect = false;
}

function incrementVocabularyStatsError(entry) {
    testRunData.error += 1;
    testRunData.currentCount += 1;
    testRunData.correctTranslation = entry.translation;
    testRunData.answerIsCorrect = false;
}

function sendStats() {
    mainWindow.webContents.send("test:stats", testRunData);
    log.info("send stats");
}

function calcGrade() {
    var percent = (testRunData.error / testRunData.currentCount) * 100
    var gradePercent = percent * 10
    var factor = Math.floor(gradePercent / 75);
    var grade = 1 + factor * 0.5
    // log.info("++ Percent %s = %s / %s ", percent, testRunData.error, testRunData.currentCount);
    // log.info("++ Grade %s = 1 + %s *0,5 ", grade, factor);
    if (grade > 6) {
        grade = 6;
    }
    testRunData.grade = grade;
}

// First Vocabulary --  Item:add
ipcMain.on('test:run', function (e, count, type) {
    log.info("[MAIN] test:run cnt=%s type=%s", count, type);
    initRun(count, type);
    nextVocabulary();
    log.info("[MAIN] test:run END");
});

// Catch test:answer
ipcMain.on('test:answer', function (e, item) {
    log.info("[MAIN] test:answer");
    log.info('Checking %s', item);
    log.info(item);
    var result = checkVocabulary(item)
    var returnResult = { "text": result, "ok": false };

    if (result == "OK") {
        returnResult.ok = true;
    }
    mainWindow.webContents.send("test:result", returnResult);
    sendStats();
    // get next vocabulary and sent it with current stats
    nextVocabulary();
    log.info("[MAIN] test:answer END");
});

// Catch Item:add
ipcMain.on('test:load', function (e, item) {
    log.info("[MAIN] test:load");
    log.info('load vocabulary');
    log.info(item);
    loadCSVFile();
    log.info("[MAIN] test:load END");
});

// check if we have a vocabulary file to open from user preferences
ipcMain.on('program:ready', function () {
    log.info("[MAIN] test:ready");
    if (activeVocabulary) {
        log.info("Tried to reload");
    } else {
        log.info('MainWindow is ready');
        loadLastFile();
    }
    log.info("[MAIN] test:ready END");
});




// handle new file
function createNewWindow() {
    // create new window
    addWindow = new BrowserWindow({
        width: 300,
        height: 500,
        titel: 'New'
    });
    //load html into window
    addWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'addWindow.html'),
        protocol: 'file',
        slashes: true
    }));
    addWindow.on('closed', function () {
        addWindow = null;
    })
}


// Create Menu template

const mainMenuTemplate = [{
    label: 'File',
    submenu: [
        {
            label: 'Load File ..',
            accelerator: 'CmdOrCtrl+O'
        },
        {
            label: 'New',
            accelerator: 'CmdOrCtrl+N',
            click() {
                createNewWindow();
            }
        },
        {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click() {
                app.quit();

            },
        }
    ]
}];


// if mac add empty
if (process.platform == 'darwin') {
    mainMenuTemplate.unshift({});
}


// 

if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer Tools',
        submenu: [
            {
                label: 'Toggle DevTools',
                accelerator: 'CmdOrCtrl+D',
                click(item, focusedWindow) {

                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }]
    })
}

