const electron = require('electron');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');

const VocTest = require('./VocTest.js');
const FileEntry = require('./FileEntry.js');
class FolderStructure {
    constructor(opts) {
        // Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
        // app.getPath('userData') will return a string of the user's app data directory path.
        const userDataPath = (electron.app || electron.remote.app).getPath('userData');
        // We'll use the `configName` property to set the file name and path.join to bring it all together as a string
        this.rootDir = opts.rootDir;
        this.fileList = [];
        this.phaseList = [];

        // this.check(); // initially check Folders
    }
    check(callback) {
        var myself = this;
        walk(myself.rootDir, function (err, results) {
            if (err) throw err;

            myself.fileList = results;
            var fileCount = results.length;
            log.info("[FOST] ABOUT TO CHECK FILE LIST LENGTH=%s", myself.fileList);
            // found entries
            if (myself.fileList) {
                for (var l = 0; l < myself.fileList.length; l++) {
                   
                    log.info("[FOST] CHECK FILE LIAT in %s from %s", l, myself.fileList[l]);
                    
                    var vocTest = new VocTest({
                        fileName: myself.fileList[l]
                    });
                    vocTest.load().then(function (resolve, reject) {
                        log.info("  [FOST LOAD] **** NAME=" + resolve.fileName);
                      
                        vocTest.initPhase();
                        log.info("  [FOST LOAD] PHASE 0=" + resolve.phaseStats);
                        var fe = new FileEntry({
                            shortName: resolve.shortName,
                            fileName: resolve.fileName,
                            p0: resolve.phaseStats[0],
                            p1: resolve.phaseStats[1],
                            p2: resolve.phaseStats[2],
                            p3: resolve.phaseStats[3],
                            p4: resolve.phaseStats[4],
                            p5: resolve.phaseStats[5],
                            phases : [],
                            phaseRelevant: resolve.phaseRelevant,
                            total: resolve.size
                        });
                        fe.phases = Array.from(resolve.phaseStats);
                        log.info("  [FOST LOAD] PHASES TOTAL=%s Details= "+ fe.phaseRelevant,fe.phases);
                        myself.phaseList.push(fe);
                        fe.printStatus();
                        log.info("  [FOST LOAD] CALLBACK");
                        callback(fe);
                        log.info("  [FOST LOAD] CALLBACK DONE");

                    });
                }

            }

        });
    }



    printStatus() {
        log.info("[FOST] rootDir %s", this.rootDir);
        if (this.phaseList) {
            for (var l = 0; l < this.phaseList; l++) {
                var fe = this.phaseList[l];
                log.info(fe);
                fe.printStatus();
            }
        } else {
            log.info("[FOST] No Files found");
        }
    }

}


function walkMain(dir, callback) {

    walk(dir, function (err, results) {
        if (err) throw err;
        //    var walker = this;
        //  var localFileList = walker
        //  myself.fileList = results;
        callback(results);
    });
}

function checkFolderStructureInternal(rootDir) {
    log.info("[FStruct] rootDir=%s", rootDir);
    walk(rootDir, function (err, results) {
        if (err) throw err;
        console.log(results);
    });
}

var walk = function (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) return done(null, results);
            file = dir + '/' + file;
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    if (file.endsWith(".csv")) {
                        results.push(file);
                        log.info("[FStruct] FOUND %s", file);
                    }
                    next();
                }
            });
        })();
    });
};


// expose the class
module.exports = FolderStructure;