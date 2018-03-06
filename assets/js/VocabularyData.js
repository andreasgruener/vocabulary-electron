const log = require('electron-log');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse');
SpellChecker = require('spellchecker');

var VocabularyData = {

    fileName: "N/A",
    fullPath: "N/A",
    data: [],
    parseErrors: [],
    hasError: false,
    size: 0,
    name: "myname",

    init: function (fn) {
        this.fileName = "N/A";
        this.fullPath = fn;
        this.size = 0;
        this.data = [];
        this.hasError = false;
        this.vocabulary = [];
        this.parseErrors = [];
    },
    fileLoaded: function () {
        if (this.size > 0) {
            return true
        }
        return false;
    },
    // loadFile: function (file) {  
    //     if (file !== '') {
    //         log.info('[VD] Loading last file %s', file);
    //         this.load(file);
    //     } else {
    //         log.info('[VD] No file to load %s', file);
    //     }
    // },

    load: function (fn) {
        myself = this;
        return new Promise(
            function (resolve, reject) {
                myself.init(fn);
                log.info("[VD] About to load" + fn);
             
                fs.readFile(fn, 'utf-8', function (err, data) {
                    if (err) {
                        reject(err);
                        return log.info(" [VD]parseCSV:", err);
                    }
                    // data is the contents of the text file we just read
                    //  log.info(data);
                    // reject promise
                    
                    parse(data, {
                        delimiter: ';',
                        relax_column_count: true,
                        columns: ['word', 'translation', 'genus']
                    }, function (err, output) {
                        log.info("[VD] ****** Parsed Start:");
                        // special handling for our format


                        myself.fullPath = fn;
                        myself.fileName = path.parse(fn).name + path.parse(fn).ext;

                        myself.specialParse(output);

                        log.info("[VD] ****** Parsed End");
                        // resolve promise
                       
                        myself.printInfo();
                        resolve("File Loaded and parsed");
                    });

                });
            });
    },


    specialParse: function (data) {
        log.info("[VD] FP=%s", this.fullPath);
        var vocs = [];
        var parseProblems = [];
        this.parseErrors = [];
        for (var i = 0; i < data.length; i++) {
            var entry = {};
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
                log.info("[VD] Translation is missing for %s", word);
                translation = "MISSING";
                var parseError = {
                    word: word,
                    raw: data[i].word,
                    row: i,
                    spellingError: false,
                    error: "Missing Translation, no semicolon"
                }
                //  log.info("[VD] PE: %s / %s", parseError.word, parseError.error);
                this.parseErrors.push(parseError);
                // log.info(this.parseErrors);
                this.hasError = true;
                //     log.info("[VD] PS: has errors %s", this.parseErrors.length);
            }

            // spell checker
            entry['spellingError'] = false;
            if ( SpellChecker.isMisspelled(word) ) {
                var correctedWord = SpellChecker.getCorrectionsForMisspelling(word);
                var parseError = {
                    word: word,
                    raw: data[i].word,
                    row: i,
                    spellingError: true,
                    correctedWord: correctedWord,
                    error: "Spell Check error! Correct: <b>" + correctedWord +"</b>"
                }
                entry['spellingError'] = true;
                this.parseErrors.push(parseError);
            }
            entry['word'] = word;
            entry['translation'] = translation;
            //     log.info(entry);
            this.data.push(entry);
            //  log.info("[VD] VOC: has  %s", this.data.length);
        }
        // log.info('**************');
        log.info('[VD] Found Errors %s', this.parseErrors.length);
        this.size = this.data.length;
        this.printInfo();
    },
    printInfo: function () {
        log.info('[VD INFO] Vocabulary File=%s, Size=%s, hasErrors=%s, Errors=%s ', this.fileName, this.size, this.hasError, this.parseErrors.length);
    }

}

module.exports = VocabularyData;