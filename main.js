const electron = require('electron');
const url = require('url');
const path = require('path');
const Store = require('./store.js');
const log = require('electron-log');

const username = require('username');
var currentUser = "unknown";
username().then(username => {
    currentUser = username;
});

// local utility classes
var mail = require('./assets/js/Mail.js');
var mqtt = require('./assets/js/MQTT.js');
var vData = require('./assets/js/VocabularyData.js');
var testRun = require('./assets/js/VocabularyTest.js');


const { app, BrowserWindow, Menu, dialog, ipcMain } = electron;


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

    // mqtt.publish(testRunData);
});

function nextVocabulary() {
    log.info("Next vocabulary");
    var entry = testRun.next();
    if (entry) {
        mainWindow.webContents.send("test:display", testRun);
        log.info("Test Display");
        return true;
    } else {
        log.info("Test over");
        testRun.calcGrade();
        log.info(testRun);
        testRun.user = currentUser;
        mail.sendMail(testRun);
        log.info("MAIL SEND -- Test over");
        mainWindow.webContents.send("test:over", testRun);
        return false;
    }
}


// First Vocabulary
ipcMain.on('test:run', function (e, count, type) {
    log.info("[MAIN] test:run cnt=%s type=%s", count, type);
    targetCount = (count > vData.size) ? vData.size : count;
    testRun.start(targetCount, type);
    nextVocabulary();
    log.info("[MAIN] test:run END");
});

// Catch test:answer
ipcMain.on('test:answer', function (e, checkEntry) {
    log.info("[MAIN] test:answer %s/%s", checkEntry.word, checkEntry.translation);
    testRun.check(checkEntry);
    mainWindow.webContents.send("test:result", testRun);
    // get next vocabulary and sent it with current stats
    nextVocabulary();
    log.info("[MAIN] test:answer END");
});

// Catch Item:add
ipcMain.on('test:load', function (e, item) {
    log.info("[MAIN] test:load");
    dialog.showOpenDialog(//{properties: ['openFile', 'openDirectory', 'multiSelections']});
        {
            filters: [
                { name: 'Vocabulary Files CSV', extensions: ['csv'] }
            ]
        }, function (fileNames) {
            if (fileNames === undefined) return;

            const fileName = fileNames[0];
            const fileDir = path.parse(fileName).dir;

            vData.load(fileName).then(function (result) {
                testRun.setVocabulary(vData);
                mainWindow.webContents.send("test:fileInfo", vData);
                store.set('vocabularyFileName', vData.fullPath);
            });
        });
    testRun.setVocabulary(vData);
    mainWindow.webContents.send("test:fileInfo", vData);
    log.info("[MAIN] test:load END");
});

// check if we have a vocabulary file to open from user preferences
ipcMain.on('program:ready', function () {
    log.info("[MAIN:READY] 1 test:ready");
    if (vData.fileLoaded()) {
        log.info("[MAIN:READY] 2 Tried to reload");
    } else {
        var lastFile = store.get('vocabularyFileName');
        vData.load(lastFile).then(function (result) {
            testRun.setVocabulary(vData);
            mainWindow.webContents.send("test:fileInfo", vData);
        });
    }
    log.info("[MAIN:READY] 7 test:ready END");
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


