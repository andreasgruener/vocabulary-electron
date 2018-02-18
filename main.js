const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const parse = require('csv-parse')
const Store = require('./store.js');
const log = require('electron-log');

const { app, BrowserWindow, Menu, dialog, ipcMain } = electron;

var activeVocabulary;
var currentIndex;
var stats;
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
        windowPosition: { x: 0, y:0 },
        vocabularyFileName: ''
    }
});

// Listen for app to be ready

app.on('ready', function () {
    // create new window
    let { width, height } = store.get('windowBounds');
    let { x, y} = store.get('windowPosition');

    // Pass those values in to the BrowserWindow options
    mainWindow = new BrowserWindow({ width, height });
   // mainWindow.setPosition(x,y);
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
        // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
        // the height, width, and x and y coordinates.
        let { width, height } = mainWindow.getBounds();
        // Now that we have them, save them using the `set` method.
        store.set('windowBounds', { width, height });
    });

    mainWindow.on('moved', () => {
        // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
        // the height, width, and x and y coordinates.
        let { x, y } = mainWindow.getPosition();
        // Now that we have them, save them using the `set` method.
        store.set('windowPosition', { x, y });
    });

    // build Menu from templatew
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert menu


    Menu.setApplicationMenu(mainMenu);
    log.info('Yeah. I am ready!');
    // loadLastFile();

});


function loadLastFile() {
    var lastFile = store.get('vocabularyFileName');

    if (lastFile !== '') {
        log.info('Loading last file %s', lastFile);
        parseCSV(lastFile);
    } else {
        log.info('No file to load %s', lastFile);
    }
}
// parse csv
function parseCSV(fileName) {
    log.info(fileName);

    fs.readFile(fileName, 'utf-8', function (err, data) {
        if (err) return log.info(err);
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
            initFileInfo(file ,activeVocabulary.length);
            //       mainWindow.webContents.send("test:display", nextVocabulary);
            mainWindow.webContents.send("parse:error", result.error);
            // store last file if it was read successfull
            store.set('vocabularyFileName', fileName);
            initStats(activeVocabulary.length);
            log.info("****** Parsed End")
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
    result['error'] = parseProblems;
    return result;
}


function checkVocabulary(check) {
    log.info("# Ready to check %s = %s.", check.word, check.translation);
    for (var i = 0; i < activeVocabulary.length; i++) {
        entry = activeVocabulary[i];
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
                incrementVocabularyStatsError();
                return "Wrong translation " + entry.translation;
            }
        }
    }
    return "Unknown Vocabulary " + check.word;
}

function nextVocabulary() {
    log.info("Next vocabulary %s", currentIndex);
    currentIndex = currentIndex + 1;
    if (currentIndex > activeVocabulary.length) {
        log.info("Test over");
        mainWindow.webContents.send("test:over", entry.word);
    } else {
        entry = activeVocabulary[currentIndex];
        mainWindow.webContents.send("test:display", entry.word);
        log.info("Test Display");
    }
}

function initStats(total) {
    currentIndex = 0;
    stats = { "total": activeVocabulary.length, "error": 0, "correct": 0 };
}

function incrementVocabularyStatsCorrect() {
    stats.correct += 1;
}

function incrementVocabularyStatsError() {
    stats.error += 1;
}

function sendStats() {
    mainWindow.webContents.send("test:stats", stats);
    log.info("send stats");
}
function initFileInfo(fileName, size) {
    fileInfo = {"fileName": fileName, "size": size};
    sendFileInfo();
}
function sendFileInfo() {
    mainWindow.webContents.send("test:fileInfo", fileInfo);
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


// Catch Item:add
// ipcMain.on('item:add', function (e, item) {
//     log.info("[MAIN] test:run");
//     log.info(item);
//     mainWindow.webContents.send('item:add', item);
//     addWindow.close();
// });

// Catch Item:add
ipcMain.on('test:load', function (e, item) {
    log.info("[MAIN] test:load");
    log.info('load vocabulary');
    log.info(item);
    loadCSVFile();
    log.info("[MAIN] test:load END");
});

// Catch test:answer
ipcMain.on('test:answer', function (e, item) {
    log.info("[MAIN] test:answer");
    log.info('Checking %s', item);
    log.info(item);
    var result = checkVocabulary(item)
    var returnResult = { "text" : result, "ok" : false };

    if (result == "OK") {
        returnResult.ok = true;
    }
    mainWindow.webContents.send("test:result", returnResult);
    // get next vocabulary and sent it with current stats
    var entry = nextVocabulary();
    sendStats();
    log.info("[MAIN] test:answer END");
});

// check if we have a vocabulary file to open from user preferences
ipcMain.on('test:ready', function () {
    log.info("[MAIN] test:ready");
    if (activeVocabulary) {
        log.info("Tried to reload");
    } else {
        log.info('MainWindow is ready');
        loadLastFile();
    }
    sendFileInfo();
    log.info("[MAIN] test:ready END");
});

// First Vocabulary --  Item:add
ipcMain.on('test:run', function (e, item) {
    log.info("[MAIN] test:run");
    nextVocabulary();
    //
    //mainWindow.webContents.send("test:display", entry.word);
    log.info("[MAIN] test:run END");
});

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
