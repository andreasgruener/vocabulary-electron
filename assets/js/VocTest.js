const electron = require('electron');
const log = require('electron-log');
const path = require('path');
const parse = require('csv-parse');
const fs = require('fs');
const SpellChecker = require('spellchecker');

class Entry {
    constructor(opts) {
        this.word = opts.word;
        this.translation = opts.translation;
        this.phase = opts.phase;
        this.lastAsked = opts.lastAsked;
        this.deleted = opts.deleted;
        this.changed = false;
        this.translations = opts.translations;
    }
    printStatus() {
        log.debug("  [ENTRY] P=%s LAST=%s D=%s C=%s %s-->%s Translations=%s",
            this.phase, this.lastAsked, this.deleted, this.changed, this.word, this.translation, this.translations.length);
    }
}

class FileContent {
    constructor(opts) {
        this.fileName = opts.fileName;
        this.shortName = path.parse(this.fileName).name + path.parse(this.fileName).ext;
        this.entries = [];
        this.size = 0;
        this.phaseStats = [];
        this.hasError = false;
        this.vocabulary = [];
        this.parseErrors = [];
    }
    csv() {
        var csv_string = "";
        for (var i = 0; i < this.entries.length; i++) {
            var entry = this.entries[i];
            if (entry.deleted) {
                log.debug("Skipping " + entry.word + " it is deleted.");
            } else {
                csv_string += entry.word + ";" + entry.translation + ";" + entry.phase + ";" + entry.lastAsked + "\n";
            }
        }
        return csv_string;
    }
    printStatus() {
        log.debug("[VocTest] Name=%s, #Size=%s",
            this.fileName, this.size);
        if (this.entries) {
            for (var e = 0; e < this.entries.length; e++) {
                this.entries[e].printStatus();
            }
        }
    }
    set entries(newEntries) {
        var newList = [];
        log.debug("[VocTest] Setting Entries " + newEntries.length);
        for (var e = 0; e < newEntries.length; e++) {
            var entry = new Entry({
                word: newEntries[e].word,
                translation: newEntries[e].translation,
                phase: newEntries[e].phase,
                lastAsked: newEntries[e].lastAsked,
                deleted: newEntries[e].deleted,
                changed: newEntries[e].changed,
                translations: newEntries[e].translations
            });
            newList.push(entry);
        }
        this._entries = newList;
        //   log.debug("[VocTest] New Entries " + this.size);
    }
    get entries() {
        return this._entries;
    }
    set size(size) {
        this._size = size;
        // ignore this stored in fileContent
    }
    get size() {
        if (this._entries) {
            return this._entries.length;
        } else { 
            return 0;
        }
    }

}

class VocTest {
    constructor(opts) {
        this.fileName = opts.fileName;
        this.shortName = path.parse(this.fileName).name + path.parse(this.fileName).ext;
        this.fileContent = new FileContent({
            fileName: this.fileName
        });
        this.size = 0;

        this.phaseRelevant = [];
        this.phaseIndices = [];
        this.phaseRelevant = 0;
        this.phaseStats = [];

        this.currenEntry = {};
        this.currentCount = 0;
        this.currentIndex = 0;
        this.answerIsCorrect = false;
        this.error = 0;
        this.correct = 0;
        this.targetCount = 0;
        this.questions = [];
        this.wrongAnswers = [];
        this.correctAnswers = [];
        // this.askedIndices= [];
        this.remainingIndices = [];
        this.askedMultitranslations = [];
        this.grade = 0;
        this.type = "N/A";
        this.started = "";
        this.finished = "";
        this.over = false;
        // this.wrongCount = 0; // number of questions asked in wrong run
        this.wrongIndex = [];
        this.currentWrongIndex = 0;
        this.wrongRunRequired = false; // set to true with first error
        this.rerun = false; // set to true with last question asked and wrong answers before
    }
    set size(size) {
        // ignore this stored in fileContent
    }
    get size() {
        return this.fileContent.size;
    }
    printStatus() {
        log.debug("############ VocTest Status ###################");
        if (this.fileContent) {
            this.fileContent.printStatus();
        } else {
            log.debug("** NO DATA");
        }
        log.debug("------------ End VocTest Status --------------------\n");
    }
    load() {
        var myself = this;
        return new Promise(

            function (resolve, reject) {
                log.debug("[VocTest] Loading ");
                myself.fileContent = new FileContent({
                    fileName: myself.fileName
                });

                loadInternal(myself.fileContent).then(function (resultEntries) {
                    //   log.debug("[VocTest] Entries %s", resultEntries.length);
                    myself.fileContent.entries = resultEntries;
                    myself.initPhase();
                    myself.printStatus();
                    // resolve("File Loaded");
                    resolve(myself);
                }).catch((error) => {
                    log.error("[VocTest] Load File failed " + error);
                });
            });

    }
    initPhase() {
        // empty current entry https://stackoverflow.com/questions/1232040/how-do-i-empty-an-array-in-javascript
        this.phaseIndices.length = 0;
        // determine which entries are ready to be asked
        //  log.debug("[VocTest::INITPHASE] P # PHASES ");
        for (var p = 0; p <= 5; p++) {
            this.phaseStats[p] = 0; // init
        }
        const daysPhase = [0, 2, 4, 8, 16, 24];

        const daysPhase0 = 0;
        const daysPhase1 = 2;
        const daysPhase2 = 4;
        const daysPhase3 = 8;
        const daysPhase4 = 16;
        const daysPhase5 = 32;

        var fullDataSet = this.fileContent.entries;
        for (var i = 0; i < fullDataSet.length; i++) {
            var entry = fullDataSet[i];
            var today = new Date();
            var lastAsked = new Date();
            if (entry.lastAsked) {
                lastAsked = new Date(entry.lastAsked);
            }
            // else {
            //     entry.phase = 0; // new vocabulary
            // }

            var lastAskedDelta = daysDiff(lastAsked, today);
            // log.debug("[VocTest::INITPHASE]P # Phase=%s, Today=%s, LastAsked=%s, Delta=%s", entry.phase, today, lastAsked, lastAskedDelta);
            if (lastAskedDelta >= daysPhase[entry.phase]) {
                this.phaseIndices.push(i);
                this.phaseRelevant++;
                log.debug("[VocTest::INITPHASE]P # 0 # Adding Phase=%s Days=%s (Delay=%s)", entry.phase, lastAskedDelta, daysPhase[entry.phase]);
            } else if (!entry.phase) {
                this.phaseIndices.push(i);
                this.phaseRelevant++;
                log.debug("[VocTest::INITPHASE]P # 0 # NO Phase Info Phase=%s Days=%s (Delay=%s)", entry.phase, lastAskedDelta, daysPhase[entry.phase]);
            } else {
                log.debug("[VocTest::INITPHASE]P # 0 # Skipping Phase=%s Days=%s (Delay=%s)", entry.phase, lastAskedDelta, daysPhase[entry.phase]);
            }
            this.phaseStats[entry.phase] = this.phaseStats[entry.phase] + 1;
            log.debug("[VocTest::INITPHASE][VD] P " + this.phaseStats[entry.phase]);
        }
        log.debug("[VocTest::INITPHASE] P # PHASES " + this.phaseStats[0]);
    }
    save() {
        var myself = this;
        return new Promise(
            function (resolve, reject) {
                var currentPath = myself.fileName;
                var backupPath = currentPath + ".save";

                fs.rename(currentPath, backupPath, function (err) {
                    log.debug("Create Backup %s and save file %s", backupPath, currentPath)
                    if (err) {
                        if (err.code === 'EXDEV') {
                            log.error("Could not move file from %s to %s", currentPath, backupPath);
                        }
                        return;
                    }
                    fs.writeFile(currentPath, myself.fileContent.csv(), function (err) {
                        if (err) {
                            log.error("[VocTest] save file failed");
                            return console.log(err);
                        }
                        log.debug("[VocTest] The file %s was saved!", currentPath);
                        //      doSomethingWithSavedFile(currentPath); // callback for reload
                        resolve("File Saved");
                    });
                    log.debug("[VocTest] moved file from %s to %s", currentPath, backupPath);
                });
            });
    }
    start(c, t) {
        log.debug("[VocTest rest count=%s type=%s", c, t);
        // for (var i = 0; i < this.total; i++) {
        //     this.remainingIndices.push(i);
        // }
        for (var i = 0; i < this.phaseRelevant; i++) {
            this.remainingIndices.push(this.phaseIndices[i]);
            log.debug("[VocTest] P " + this.fileContent.entries[this.phaseIndices[i]].phase);
            log.debug(this.fileContent.entries[this.phaseIndices[i]]);
        }
        this.targetCount = c;
        this.type = t;
        this.started = new Date();
    }
    nextRerun() {
        log.debug("######################## WRONG = %s", this.wrongIndex.length);
        for (var c = 0; c < this.wrongIndex.length; c++) {

            log.debug("# Entry Index=%s RealIndex=%s word=%s" + c, this.wrongIndex[c], this.fileContent.entries[this.wrongIndex[c]].word);
        }
        log.debug("[VT] RERUN ### CHECK: %s >= %s", this.currentWrongIndex, this.wrongIndex.length);
        if (this.currentWrongIndex >= this.wrongIndex.length) {
            return;
        }
        log.debug("");
        log.debug("[VT] RERUN ### For type: %s", this.type);
        log.debug("[VT] RERUN Next Vocabulary %s : %s ", this.currentWrongIndex, this.wrongIndex.length);

        var answered = this.wrongAnswers.length + this.correctAnswers.length;
        log.debug("[VT] RERUN Check 4 More :: ( answered: %s >=  total: %s )  OR ( %s <= 0 ) :: target: %s (multiple translations per entry)", answered, this.targetCount, this.remainingIndices.length, this.targetCount);

        this.currentIndex = this.wrongIndex[this.currentWrongIndex];

        var entry = this.fileContent.entries[this.currentIndex];
        var multiTransCount = entry.translations.length;



        log.debug("########################");
        //  log.debug(entry.translations);
        log.debug("Size %s and type %s", multiTransCount, this.type);

        if (this.type == "EN") {
            entry.ask = entry.word;
        } else {
            if (multiTransCount > 1) { // multiple translation to ask
                var randomMulti = Math.floor(Math.random() * Math.floor(multiTransCount - 1));
                entry.ask = entry.translations[randomMulti];
            } else {
                entry.ask = entry.translation;
            }
        }

        log.debug("- 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 *+")
        log.debug(this.remainingIndices);
        log.debug(this.askedMultitranslations);
        log.debug("- 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 *+")

        log.debug("[VT] RERUN ***** vocabualry asked  index=%s currentWrongIndex=%s )", this.currentIndex, this.currentWrongIndex);
        //log.debug(this.remainingIndices);

        this.currentWrongIndex++;
        this.currentEntry = entry;
        log.debug("[VT] Next Vocabulary %s : %s ", entry.ask, entry.translation);
        return entry;
    }
    next() {
        log.debug("");
        log.debug("[VocTest] ### For type: %s", this.type);
        log.debug("[VocTest] Next Vocabulary %s : %s ", this.currentIndex, this.targetCount);

        var answered = this.wrongAnswers.length + this.correctAnswers.length;
        log.debug("[VocTest] Check for more :: ( answered: %s >=  total: %s )  OR ( %s <= 0 ) :: target: %s (multiple translations per entry)", answered, this.targetCount, this.remainingIndices.length, this.targetCount);

        // check if out of vocabulary...
        if (this.remainingIndices.length <= 0 ||  
            answered >= this.targetCount) {
            log.warn("[VocTest] all vocabualry asked %s - %s of %s", this.total, this.remainingIndices.length, this.targetCount);
            this.over = true;
            this.targetCount = this.wrongAnswers.length + this.correctAnswers.length;
            this.rerun = this.wrongRunRequired; // set the if required the rerun mode
            return;
        }
        // pick a random remaining entry
        var random = Math.floor(Math.random() * Math.floor(this.remainingIndices.length));
        this.currentIndex = this.remainingIndices[random];

        // get entry
        var entry = this.fileContent.entries[this.currentIndex];
        log.debug(">>>> [VocTest] ASKING .....");
        log.debug(entry);
        log.debug("<<<<< [VocTest] ASKING .....");
        var multiTransCount = entry.translations.length;
        var exitingMultitrans = this.askedMultitranslations[this.currentIndex];
        //   log.debug(entry.translations);
        log.debug("Size %s and type %s", multiTransCount, this.type);
        if (this.type == "EN") {
            entry.ask = entry.word;
            this.remainingIndices.splice(random, 1);

        } else if (this.type == "DE") {


            if (multiTransCount > 1) { // multiple translation to ask

                var askedMultiTrans = exitingMultitrans;
                var randomMulti = Math.floor(Math.random() * Math.floor(multiTransCount - 1));

                // check if got this before
                if (askedMultiTrans) { // second++ time this entry
                    randomMulti = Math.floor(Math.random() * Math.floor(askedMultiTrans.length - 1));
                    log.debug("   [VocTest second time - random = %s", randomMulti);
                    entry.ask = entry.translations[askedMultiTrans[randomMulti]];
                    askedMultiTrans.splice(randomMulti, 1);
                    if (askedMultiTrans.length < 1) {
                        this.remainingIndices.splice(random, 1);
                    }

                    log.debug(randomMulti);
                } else {
                    askedMultiTrans = [];
                    for (var m = 0; m < multiTransCount; m++) {
                        askedMultiTrans.push(m);
                    }
                    log.debug("   [VocTest first time");
                    askedMultiTrans.splice(randomMulti, 1);
                    entry.ask = entry.translations[randomMulti];
                    log.debug(askedMultiTrans);
                }

                this.askedMultitranslations[this.currentIndex] = askedMultiTrans;
            } else {
                entry.ask = entry.translation;
                this.remainingIndices.splice(random, 1);
            }
        } else {
            log.error("Unsupported TYPE " + this.type);
        }
        log.debug("- 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 *+")
        log.debug(this.remainingIndices);
        log.debug(this.askedMultitranslations);
        log.debug("- 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 *+")

        log.debug("[VocTest] ***** vocabualry asked random=%s, index=%s (%s of %s)", random, this.currentIndex, this.remainingIndices.length, this.targetCount);
        //log.debug(this.remainingIndices);



        this.currentEntry = entry;
        log.debug("[VocTest] Next Vocabulary %s : %s ", entry.ask, entry.translation);
        return entry;
    }
    check(check) {
        this.currentCount++;
        // var askedEntry = {};
        log.debug(this.currentEntry);
        if (this.type == "EN") {
            check.correct_translations = this.currentEntry.translations;
        } else {
            check.correct_translations = [this.currentEntry.word];
        }

        log.debug("[VT] To check %s / %s --> correct: %s ( %s/%s )", check.word_displayed, check.translation_entered, check.correct_translation, this.currentEntry.word, this.currentEntry.translation);
        log.debug(check.correct_translations);
        var enteredAsArray = check.translation_entered.split(":").sort();
        var allCorrect = true;
        for ( var eaa =0; eaa<enteredAsArray.length; eaa++) {
           
            if ( check.correct_translations.includes(enteredAsArray[eaa])) {
                log.debug("  +++  %s is in %s", enteredAsArray[eaa], check.correct_translations);
            } else {
                allCorrect = false;
                log.debug("  ---  %s is NOT in %s", enteredAsArray[eaa], check.correct_translations);
            }
        }
        if ( enteredAsArray.length != check.correct_translations.length ) {
            log.debug("  ---  Wrong #answers %s != %s", enteredAsArray.length, check.correct_translations.length);
            allCorrect = false;
        }
        if (allCorrect) {
            this.correct++;
            this.answerIsCorrect = true;

            // phase handling
            if (!this.rerun) {
                this.currentEntry.phase = parseInt(this.currentEntry.phase) + 1;
                this.currentEntry.lastAsked = today();
                check.phase = this.currentEntry.phase;
                log.debug("[VT] P increasing phase %s and setting new date ", this.currentEntry.phase, this.currentEntry.lastAsked);
            } else {
                log.debug("[VT] P NOT increasing phase due to error before");
            }


            this.correctAnswers.push(check);
            log.debug("[VT] CORRECT " + this.correctAnswer);
        } else {
            this.error++;
            this.answerIsCorrect = false;

            // phase handling
            if (this.currentEntry.phase > 0) {
                this.currentEntry.phase = parseInt(this.currentEntry.phase) - 1;
            }
            this.currentEntry.lastAsked = today();
            check.phase = this.currentEntry.phase;

            if (!this.rerun) {
                this.wrongAnswers.push(check);
               

                this.wrongIndex.push(this.currentIndex); // remember the index asked
                this.correctTranslations = check.correct_translations;
            }
            log.debug("[VT] WRONG %s", this.correctTranslations);
            this.wrongRunRequired = true; // need to ask the wrong answered questions at the end


            log.debug("[VT] P decreasing phase %s and setting new date ", this.currentEntry.phase, this.currentEntry.lastAsked);
        }
        return this.answerIsCorrect;
    }
    calcGrade() {
        this.finished = new Date();
        this.duration = this.finished.getSeconds() - this.started.getSeconds();
        log.debug("[VT] START " + this.started + " -- " + this.finished);
        var percent = (this.error / this.currentCount) * 100
        var gradePercent = percent * 10
        var factor = Math.floor(gradePercent / 75);
        var tgrade = 1 + factor * 0.5
        // log.debug("++ Percent %s = %s / %s ", percent, this.error, this.currentCount);
        // log.debug("++ Grade %s = 1 + %s *0,5 ", grade, factor);
        if (tgrade > 6) {
            tgrade = 6;
        }
        this.grade = tgrade;

        return this.grade;
    }

}

function daysDiff(date1, date2) {

    //Get 1 day in milliseconds
    var one_day = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = date2_ms - date1_ms;
    //  log.debug("D1=%s D2=%s DELTA=%s", date1_ms, date2_ms, difference_ms);
    // Convert back to days and return
    return Math.round(difference_ms / one_day);

}

function loadInternal(fileContent) {
    myself = this;
    log.debug("[VocTest] About to load " + fileContent.fileName);
    return new Promise(
        function (resolve, reject) {

            fs.readFile(fileContent.fileName, 'utf-8', function (err, data) {
                if (err) {

                    var parseError = {
                        word: "no data",
                        raw: "no data",
                        row: 0,
                        spellingError: false,
                        error: "File not found: " + fileContent.fileName
                    };
                    fileContent.parseErrors.push(parseError);
                    log.debug(this.parseErrors);
                    fileContent.hasError = true;
                    //throw new Error("[VocTest] Load File failed " + err);

                }
                // data is the contents of the text file we just read
                //  log.debug(data);
                // reject promise

                parse(data, {
                    delimiter: ';',
                    relax_column_count: true,
                    columns: ['word', 'translation', 'phase', 'lastAsked']
                }, function (err, output) {
                    log.debug("[VocTest] ****** Parsed Start:");
                    // special handling for our format




                    if (fileContent.hasError) {
                        // loading failed
                        fileContent.fileName += " (NOT FOUND)";
                        resolve("File loading failed");
                    } else {
                        var entriesList = specialParse(output, fileContent);

                        log.debug("[VocTest] ****** Parsed End");
                        // resolve promise
                        // TODO  fileContent.initPhase();

                        // log.debug("[VocTest] ****** Phase Init DONE " + entriesList);

                        //     fileContent.printStatus();
                        resolve(entriesList);
                    }
                });

            });
        });
}


function today() {
    var d = new Date();

    //d.setHours(d.getHours() + d.getTimezoneOffset() / 60);
    dateString = d.getFullYear() + "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
        ("0" + d.getDate()).slice(-2);
    return dateString;
}

function specialParse(data, fileContent) {
    var entriesList = [];
    var vocs = [];
    var parseProblems = [];


    for (var i = 0; i < data.length; i++) {

        var entry = new Entry({
            word: data[i].word,
            translation: data[i].translation,
            phase: data[i].phase,
            lastAsked: data[i].lastAsked,
            deleted: false,
            changed: false,
            translations: []
        });

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
                log.debug("[VocTest] Found multiple Translations");
                log.debug(entry.translations);
            } else {
                entry.translations = [entry.translation];
            }
        } else {
            log.warn("[VocTest] Translation is missing for %s", entry.word);
            translation = "MISSING";
            var parseError = {
                word: entry.word,
                raw: data[i].word,
                row: i,
                spellingError: false,
                error: "Line " + i + ": Missing Translation, no semicolon"
            };
            //  log.debug("[VocTest] PE: %s / %s", parseError.word, parseError.error);
            fileContent.parseErrors.push(parseError);
            // log.debug(fileContent.parseErrors);
            fileContent.hasError = true;
            //     log.debug("[VocTest] PS: has errors %s", fileContent.parseErrors.length);
        }
        if (!data[i].phase) {
            entry.phase = 0;
        } else {
            entry.phase = data[i].phase;
        }
        if (!entry.lastAsked) {
            entry.lastAsked = "";
        }
        log.debug(entry);
        // *** spell checker
        entry.spellingError = false;

        var spellCheckResult = SpellChecker.checkSpelling(entry.word);

        log.debug("[VocTest]" + spellCheckResult);
        if (spellCheckResult.length > 0) {
            var errorText = "";
            var wrongText = "";
            var correctedText = "";
            var checkHighlightedWord = entry.word;
            for (var e = 0; e < spellCheckResult.length; e++) {
                log.debug("[VocTest]" + "*** s" + spellCheckResult[e].start + " " + spellCheckResult[e].end);
                var problemWord = entry.word.substring(spellCheckResult[e].start, spellCheckResult[e].end);
                log.debug("[VocTest]" + problemWord);
                var correction = SpellChecker.getCorrectionsForMisspelling(problemWord);
                errorText += problemWord + "-->  <b>" + correction + "</b>, ";
                wrongText += problemWord + ", ";
                correctedText += correction + ", ";
                checkHighlightedWord = checkHighlightedWord.replace(problemWord, '<span class="text-danger">' + problemWord + '</span>');
                log.debug("[VocTest]" + errorText);
                log.debug("[VocTest]" + checkHighlightedWord);
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
            fileContent.parseErrors.push(spellError);
        }
        //     log.debug(entry);
        entry.printStatus();
        entriesList.push(entry);
        //log.debug("[VocTest] VOC: has  %s", fileContent.data.length);
    }
    // log.debug('**************');
    if (fileContent.parseErrors.length > 0) {
        fileContent.hasError = true;
    }
    // log.debug('[VocTest] Found Errors %s', fileContent.parseErrors);
    // fileContent.size = fileContent.data.length;
    return entriesList;
}

// expose the class
module.exports = VocTest;