const electron = require('electron');
const url = require('url');
const path = require('path');
const Store = require('./Store.js');
const log = require('electron-log');

log.transports.console.level = 'info';


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


const {
    app,
    BrowserWindow,
    Menu,
    dialog,
    ipcMain
} = electron;


var fileInfo;
// SET ENVIRONMENT
//process.env.NODE_ENV = 'production';

let mainWindow;
let editWindow;

// First instantiate the class
const store = new Store({
    // We'll call our data file 'user-preferences'
    configName: 'user-preferences',
    defaults: {
        // 800x600 is the default size of our window
        windowBounds: {
            width: 1280,
            height: 800
        },
        windowPositionX: 300,
        windowPositionY: 300,
        vocabularyFileName: ''
    }
});

// Listen for app to be ready

app.on('ready', function () {
    // create new window
    let {
        width,
        height
    } = store.get('windowBounds');
    let x = store.get('windowPositionX');
    let y = store.get('windowPositionY');

    log.debug("Loaded pos %s, %s", x, y);
    // Pass those values in to the BrowserWindow options
    mainWindow = new BrowserWindow({
        width,
        height,
        titleBarStyle: 'hiddenInset'
    });
    if (x) {
        mainWindow.setPosition(x, y);
    } else {
        log.debug("No stored Window position.");
    }
    //load html into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file',
        slashes: true
    }));
    // Quit App when closed ((X))
    mainWindow.on('closed', function () {
        app.quit();
    });

    // The BrowserWindow class extends the node.js core EventEmitter class, so we use that API
    // to listen to events on the BrowserWindow. The resize event is emitted when the window size changes.
    mainWindow.on('resize', () => {
        store.set('windowBounds', {
            width,
            height
        });
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
    log.debug("Next vocabulary");
    var entry = testRun.next();
    if (entry) {
        mainWindow.webContents.send("test:display", testRun);
        log.debug("Test Display");
        return true;
    } else {
        log.debug("Test over");
        testRun.calcGrade();
        log.debug(testRun);
        testRun.user = currentUser;
        mail.sendMail(testRun);
        log.debug("MAIL SEND -- Test over");
        mainWindow.webContents.send("test:over", testRun);
        return false;
    }
}

// Show Edit Window
ipcMain.on('data:close', function (e) {
    log.debug("[MAIN] data:close ");
    editWindow.close();
});

ipcMain.on('data:showEdit', function (e) {
    log.debug("[MAIN] data:showEdit ");
    createNewWindow();
});

// Show Edit Window
ipcMain.on('data:save', function (e, vDataSave) {
    log.debug("[MAIN] data:saveEdit ");
    //log.debug(vDataSave);
    vDataSave.data.forEach(function (element) {
        log.debug(" " + element.deleted + " " + element.changed + " " + element.word + " = " + element.translation);
    });
    vData.data = vDataSave.data;
    vData.save();
    log.debug("[MAIN] test:run END");
});

// First Vocabulary
ipcMain.on('test:run', function (e, count, type) {
    log.debug("[MAIN] test:run cnt=%s type=%s", count, type);
    targetCount = count;
    testRun.start(targetCount, type);
    nextVocabulary();
    log.debug("[MAIN] test:run END");
});

// Catch test:answer
ipcMain.on('test:answer', function (e, checkEntry) {
    log.debug("[MAIN] test:answer %s/%s", checkEntry.word, checkEntry.translation);
    testRun.check(checkEntry);
    mainWindow.webContents.send("test:result", testRun);
    // get next vocabulary and sent it with current stats
    nextVocabulary();
    log.debug("[MAIN] test:answer END");
});

// 
ipcMain.on('test:load', function (e, item) {
    log.debug("[MAIN] test:load");
    dialog.showOpenDialog( //{properties: ['openFile', 'openDirectory', 'multiSelections']});
        {
            filters: [{
                name: 'Vocabulary Files CSV',
                extensions: ['csv']
            }]
        },
        function (fileNames) {
            if (fileNames === undefined) return;

            const fileName = fileNames[0];
            const fileDir = path.parse(fileName).dir;
            try {
                vData.load(fileName).then(function (result, reject) {
                    testRun.setVocabulary(vData);
                    mainWindow.webContents.send("test:fileInfo", vData);
                    store.set('vocabularyFileName', vData.fullPath);
                });
            } catch (err) {
                vData.hasError = true;
                var parseError = {
                    word: "no data",
                    raw: "no data",
                    row: 0,
                    spellingError: false,
                    error: "File not found: " + fn
                };
                vData.parseErrors.push(parseError);
                // log.debug(this.parseErrors);
                myself.hasError = true;
                mainWindow.webContents.send("test:fileInfo", vData);
            }
        });
    testRun.setVocabulary(vData);
    mainWindow.webContents.send("test:fileInfo", vData);
    log.debug("[MAIN] test:load END");
});

// check if we have a vocabulary file to open from user preferences
ipcMain.on('program:ready', function () {
    if (vData.fileLoaded()) {
        log.debug("[MAIN:READY] Tried to reload");
    } else {
        var lastFile = store.get('vocabularyFileName');
        vData.load(lastFile).then(function (result) {
            testRun.setVocabulary(vData);
            mainWindow.webContents.send("test:fileInfo", vData);
        });
    }
    log.debug("[MAIN:READY] END");
});


// handle new file
function createNewWindow() {
    // create new window
    editWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        titel: 'New',
        // frame:false
        titleBarStyle: 'hiddenInset'
    });
    //load html into window
    editWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'editWindow.html'),
        protocol: 'file',
        slashes: true
    }));
    editWindow.on('closed', function () {
        editWindow = null;
    });

    editWindow.on('ready-to-show', function () {
        editWindow = null;
        log.debug('[EDIT WINDOW] Ready');
    });


    log.debug('[EDIT WINDOW] Done');
}

// Show Edit Window
ipcMain.on('edit:ready', function (e) {
    log.debug("[MAIN] edit:ready ");
    editWindow.webContents.send("data:fileInfo", vData);
    log.debug("[MAIN] edit:ready");
});


// Create Menu template
const mainMenuTemplate = [{
    label: 'File',
    submenu: [{
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
        submenu: [{
                label: 'Toggle DevTools',
                accelerator: 'CmdOrCtrl+D',
                click(item, focusedWindow) {

                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    });
}