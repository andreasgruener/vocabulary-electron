const log = require('electron-log');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse');
SpellChecker = require('spellchecker');

log.transports.console.level = 'info';

var VocabularyData = {

    fileName: "N/A",
    fullPath: "N/A",
    data: [],
    // phase based questions
    phaseIndices: [],
    phaseRelevant: 0,
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
            return true;
        }
        return false;
    },
    // loadFile: function (file) {  
    //     if (file !== '') {
    //         log.debug('[VD] Loading last file %s', file);
    //         this.load(file);
    //     } else {
    //         log.debug('[VD] No file to load %s', file);
    //     }
    // },

    save: function () {
        var fn = this.fullPath;
        var oldPath = fn;
        var newPath = fn + ".save";
        var myself = this;
        fs.rename(oldPath, newPath, function (err) {
            if (err) {
                if (err.code === 'EXDEV') {
                    log.error("Could not move file from %s to %s", oldPath, newPath);
                }
                return;
            }
            fs.writeFile(fn, myself.csv(), function (err) {
                if (err) {
                    log.error("[VD] save file failed");
                    return console.log(err);
                }
                log.info("[VD] The file %s was saved!", fn);
            });
            log.info("[VD] moved file from %s to %s", oldPath, newPath);
        });

    },
    daysDiff: function (date1, date2) {

        //Get 1 day in milliseconds
        var one_day = 1000 * 60 * 60 * 24;

        // Convert both dates to milliseconds
        var date1_ms = date1.getTime();
        var date2_ms = date2.getTime();

        // Calculate the difference in milliseconds
        var difference_ms = date2_ms - date1_ms;

        // Convert back to days and return
        return Math.round(difference_ms / one_day);

    },
    initPhase: function () {
        // empty current entry https://stackoverflow.com/questions/1232040/how-do-i-empty-an-array-in-javascript
        this.phaseIndices.length = 0;
        // determine which entries are ready to be asked
        log.info(" P # ");
        const daysPhase = [0, 2, 4, 8, 16, 32];

        const daysPhase0 = 0;
        const daysPhase1 = 2;
        const daysPhase2 = 4;
        const daysPhase3 = 8;
        const daysPhase4 = 16;
        const daysPhase5 = 32;

        var fullDataSet = this.data;
        for (var i = 0; i < fullDataSet.length; i++) {
            var entry = fullDataSet[i];
            var today = new Date();
            var lastAsked = new Date();
            if (entry.lastAsked) {
                lastAsked = new Date(entry.lastAsked);
            }

            var lastAskedDelta = this.daysDiff(lastAsked, today);
            log.info("P # " + entry.phase);
            if (lastAskedDelta >= daysPhase[entry.phase]) {
                this.phaseIndices.push(i);
                this.phaseRelevant++;
                log.info("P # 0 # Adding Phase=%s Days=%s", entry.phase, lastAskedDelta);
            } else {
                log.info("P # 0 # Skipping Phase=%s Days=%s", entry.phase, lastAskedDelta);
            }
        }
    },
    csv: function () {
        var csv_string = "";
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i].deleted) {
                log.debug("Skipping " + this.data[i].word + " it is deleted.");
            } else {
                csv_string += this.data[i].word + ";" + this.data[i].translation + ";" + this.data[i].phase + ";" + this.data[i].lastAsked + "\n";
            }
        }
        return csv_string;
    },
    load: function (fn) {
        myself = this;
        return new Promise(
            function (resolve, reject) {
                myself.init(fn);
                log.debug("[VD] About to load" + fn);

                fs.readFile(fn, 'utf-8', function (err, data) {
                    if (err) {

                        var parseError = {
                            word: "no data",
                            raw: "no data",
                            row: 0,
                            spellingError: false,
                            error: "File not found: " + fn
                        };
                        myself.parseErrors.push(parseError);
                        log.debug(this.parseErrors);
                        myself.hasError = true;
                        //throw new Error("[VD] Load File failed " + err);

                    }
                    // data is the contents of the text file we just read
                    //  log.debug(data);
                    // reject promise

                    parse(data, {
                        delimiter: ';',
                        relax_column_count: true,
                        columns: ['word', 'translation', 'phase', 'lastAsked']
                    }, function (err, output) {
                        log.info("[VD] ****** Parsed Start:");
                        // special handling for our format


                        myself.fullPath = fn;
                        myself.fileName = path.parse(fn).name + path.parse(fn).ext;
                        if (myself.hasError) {
                            // loading failed
                            myself.fileName += " (NOT FOUND)";
                            resolve("File loading failed");
                        } else {
                            myself.specialParse(output);

                            log.info("[VD] ****** Parsed End");
                            // resolve promise
                            myself.initPhase();

                            log.info("[VD] ****** Phase Init DONE ");

                            myself.printInfo();
                            resolve("File Loaded and parsed");
                        }
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
            var entry = {
                word: data[i].word,
                translation: data[i].translation,
                phase: data[i].phase,
                lastAsked: data[i].lastAsked,
                deleted: false,
                changed: false,
                translations: []
            };
            // latin -- ignore other values for now
            if (entry.word.indexOf('|') >= 0) {
                entry.word = entry.word.split("|")[0];
            }
            // latin -- ignore other values for now
            if (entry.word.indexOf(':') >= 0) {
                entry.word = entry.word.split(":")[0];
            }
            //
            if (entry.translation) {
                if (entry.translation.indexOf(':') >= 0) {
                    entry.translations = entry.translation.split(":");
                    log.debug("[VD] Found multiple Translations");
                    log.debug(entry.translations);
                } else {
                    entry.translations = [entry.translation];
                }
            } else {
                log.warn("[VD] Translation is missing for %s", entry.word);
                translation = "MISSING";
                var parseError = {
                    word: entry.word,
                    raw: data[i].word,
                    row: i,
                    spellingError: false,
                    error: "Line " + i + ": Missing Translation, no semicolon"
                };
                //  log.debug("[VD] PE: %s / %s", parseError.word, parseError.error);
                this.parseErrors.push(parseError);
                // log.debug(this.parseErrors);
                this.hasError = true;
                //     log.debug("[VD] PS: has errors %s", this.parseErrors.length);
            }
            if (!entry.phase) {
                entry.phase = 0;
            }
            if (!entry.lastAsked) {
                entry.lastAsked = "";
            }
            log.debug(entry);
            // *** spell checker
            entry.spellingError = false;

            var spellCheckResult = SpellChecker.checkSpelling(entry.word);

            log.debug("[VD]" + spellCheckResult);
            if (spellCheckResult.length > 0) {
                var errorText = "";
                var wrongText = "";
                var correctedText = "";
                var checkHighlightedWord = entry.word;
                for (var e = 0; e < spellCheckResult.length; e++) {
                    log.debug("[VD]" + "*** s" + spellCheckResult[e].start + " " + spellCheckResult[e].end);
                    var problemWord = entry.word.substring(spellCheckResult[e].start, spellCheckResult[e].end);
                    log.debug("[VD]" + problemWord);
                    var correction = SpellChecker.getCorrectionsForMisspelling(problemWord);
                    errorText += problemWord + "-->  <b>" + correction + "</b>, ";
                    wrongText += problemWord + ", ";
                    correctedText += correction + ", ";
                    checkHighlightedWord = checkHighlightedWord.replace(problemWord, '<span class="text-danger">' + problemWord + '</span>');
                    log.debug("[VD]" + errorText);
                    log.debug("[VD]" + checkHighlightedWord);
                }
                var spellError = {
                    word: entry.word,
                    highlightedWord: checkHighlightedWord,
                    raw: data[i].word,
                    row: i,
                    spellingError: true,
                    correctedWord: wrongText,
                    error: "Line " + (i + 1) + ": " + errorText
                };
                entry.spellingError = true;
                entry.correctedWord = correctedText;
                this.parseErrors.push(spellError);
            }
            //     log.debug(entry);
            this.data.push(entry);
            //log.debug("[VD] VOC: has  %s", this.data.length);
        }
        // log.debug('**************');
        if (this.parseErrors.length > 0) {
            this.hasError = true;
        }
        log.debug('[VD] Found Errors %s', this.parseErrors.length);
        this.size = this.data.length;

    },
    printInfo: function () {
        log.info('[VD INFO] Vocabulary File=%s, Size=%s, hasErrors=%s, Errors=%s ', this.fileName, this.size, this.hasError, this.parseErrors.length);
    }

};

module.exports = VocabularyData;