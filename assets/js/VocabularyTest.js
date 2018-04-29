const log = require('electron-log');
const ENGLISH = "english";
const LATEIN = "latein";


var VocabularyTest = {

    currentEntry: {}, // word translation
    correctTranslation: "N/A",
    answerIsCorrect: false,
    currentCount: 0,
    currentIndex: 0,

    error: 0,
    total: 0,
    correct: 0,
    targetCount: 0,
    //  wrongCount: 0, // number of questions asked in wrong run
    wrongIndex: [],
    currentWrongIndex: 0,
    wrongRunRequired: false, // set to true with first error
    rerun: false, // set to true with last question asked and wrong answers before


    questions: [],
    wrongAnswers: [],
    correctAnswers: [],
    //   askedIndices: [],
    remainingIndices: [],
    askedMultitranslations: [],

    grade: 0,
    fileName: 'unknown',
    fullPath: 'unknown',
    language: "english",

    type: "NA", // DE or EN
    started: "",
    finished: "",
    duration: 0, // in seconds
    over: false,

    vData: {},
    user: "Unknown",

    reset: function () {

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
        log.info("[VT] RESET DATA");
    },

    start: function (c, t) {
        log.debug("[VT rest count=%s type=%s", c, t)
        this.reset();
        // for (var i = 0; i < this.total; i++) {
        //     this.remainingIndices.push(i);
        // }
        for (var i = 0; i < this.vData.phaseRelevant; i++) {
            this.remainingIndices.push(this.vData.phaseIndices[i]);
            log.info("[VT] P " + this.vData.data[this.vData.phaseIndices[i]].phase);
        }
        this.targetCount = c;
        this.type = t;
        this.started = new Date();
    },
    setVocabulary: function (vd) {
        this.vData = vd;
        this.total = vd.size;
        this.fileName = vd.fileName;
        this.fullPath = vd.fullPath;
        this.language = "english";
        if (this.fullPath.indexOf("latein") > 0 || this.fullPath.indexOf("latin") > 0) {
            this.language = "latein";
        }
    },
    nextRerun: function () {
        log.info("######################## WRONG = %s", this.wrongIndex.length);
        for (var c = 0; c < this.wrongIndex.length; c++) {

            log.info("# Entry Index=%s RealIndex=%s word=%s" + c, this.wrongIndex[c], this.vData.data[this.wrongIndex[c]].word);
        }
        log.info("[VT] RERUN ### CHECK: %s >= %s", this.currentWrongIndex, this.wrongIndex.length);
        if (this.currentWrongIndex >= this.wrongIndex.length) {
            return;
        }
        log.info("");
        log.info("[VT] RERUN ### For type: %s", this.type);
        log.info("[VT] RERUN Next Vocabulary %s : %s ", this.currentWrongIndex, this.wrongIndex.length);

        var answered = this.wrongAnswers.length + this.correctAnswers.length;
        log.info("[VT] RERUN Check 4 More :: ( answered: %s >=  total: %s )  OR ( %s <= 0 ) :: target: %s (multiple translations per entry)", answered, this.targetCount, this.remainingIndices.length, this.targetCount);

        this.currentIndex = this.wrongIndex[this.currentWrongIndex];

        var entry = this.vData.data[this.currentIndex];
        var multiTransCount = entry.translations.length;



        log.info("########################");
        //  log.info(entry.translations);
        log.info("Size %s and type %s", multiTransCount, this.type);

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

        log.info("- 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 *+")
        log.info(this.remainingIndices);
        log.info(this.askedMultitranslations);
        log.info("- 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 - 00 *+")

        log.info("[VT] RERUN ***** vocabualry asked  index=%s currentWrongIndex=%s )", this.currentIndex, this.currentWrongIndex);
        //log.debug(this.remainingIndices);

        this.currentWrongIndex++;
        this.currentEntry = entry;
        log.debug("[VT] Next Vocabulary %s : %s ", entry.ask, entry.translation);
        return entry;
    },
    nextPhaseEntry: function () {

    },
    next: function () {
        log.debug("");
        log.debug("[VT] ### For type: %s", this.type);
        log.debug("[VT] Next Vocabulary %s : %s ", this.currentIndex, this.targetCount);

        var answered = this.wrongAnswers.length + this.correctAnswers.length;
        log.info("[VT] Check for more :: ( answered: %s >=  total: %s )  OR ( %s <= 0 ) :: target: %s (multiple translations per entry)", answered, this.targetCount, this.remainingIndices.length, this.targetCount);

        if (this.remainingIndices.length <= 0 ||  
            answered >= this.targetCount) {
            log.warn("[VT] all vocabualry asked %s - %s of %s", this.total, this.remainingIndices.length, this.targetCount);
            over = true;
            this.targetCount = this.wrongAnswers.length + this.correctAnswers.length;
            this.rerun = this.wrongRunRequired; // set the if required the rerun mode
            return;
        }
        var random = Math.floor(Math.random() * Math.floor(this.remainingIndices.length));
        this.currentIndex = this.remainingIndices[random];

        var entry = this.vData.data[this.currentIndex];
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
                    log.debug("   [VT second time - random = %s", randomMulti);
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
                    log.debug("   [VT first time");
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

        log.debug("[VT] ***** vocabualry asked random=%s, index=%s (%s of %s)", random, this.currentIndex, this.remainingIndices.length, this.targetCount);
        //log.debug(this.remainingIndices);



        this.currentEntry = entry;
        log.debug("[VT] Next Vocabulary %s : %s ", entry.ask, entry.translation);
        return entry;
    },
    today: function () {
        var d = new Date();

        //d.setHours(d.getHours() + d.getTimezoneOffset() / 60);
        dateString = d.getFullYear() + "-" +
            ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
            ("0" + d.getDate()).slice(-2);
        return dateString;
    },
    check: function (check) {
        this.currentCount++;
        // var askedEntry = {};

        if (this.type == "EN") {
            check.correct_translations = this.currentEntry.translations;
        } else {
            check.correct_translations = [this.currentEntry.word];
        }

        log.debug("[VT] To check %s / %s --> correct: %s ( %s/%s )", check.word_displayed, check.translation_entered, check.correct_translation, this.currentEntry.word, this.currentEntry.translation);
        if (check.correct_translations.includes(check.translation_entered)) {
            this.correct++;
            this.answerIsCorrect = true;

            // phase handling
            if (!this.rerun) {
                this.currentEntry.phase = parseInt(this.currentEntry.phase) + 1;
                this.currentEntry.lastAsked = this.today();
                check.phase = this.currentEntry.phase;
                log.info("[VT] P increasing phase %s and setting new date ", this.currentEntry.phase, this.currentEntry.lastAsked);
            } else {
                log.info("[VT] P NOT increasing phase due to error before");
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
            this.currentEntry.lastAsked = this.today();
            check.phase = this.currentEntry.phase;

            if (!this.rerun) {
                this.wrongAnswers.push(check);
                this.wrongIndex.push(this.currentIndex); // remember the index asked
                this.correctTranslations = check.correct_translations;
            }
            log.debug("[VT] WRONG %s", this.correctTranslations);
            this.wrongRunRequired = true; // need to ask the wrong answered questions at the end


            log.info("[VT] P decreasing phase %s and setting new date ", this.currentEntry.phase, this.currentEntry.lastAsked);
        }
        return this.answerIsCorrect;
    },
    calcGrade: function () {
        this.finished = new Date();
        this.duration = this.finished.getSeconds() - this.started.getSeconds();
        log.info("[VT] START " + this.started + " -- " + this.finished);
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


module.exports = VocabularyTest;

// 'error': 0,
// 'total': result.size,
// 'correct': 0,
// 'currentIndex': 0,  // index to ask
// 'word': '<No Data>',  // the word to ask
// 'correctTranslation': '<No Data>',  // the translation at index
// 'answerIsCorrect': false,  // used to check if the answer is correct
// 'currentCount': 0, // counter for current run
// 'grade': 0, // initial grade
// 'targetCount': 0,  // target counter for this run
// 'type': '<No Data>',
// 'started' : "jetzt",
// 'fileName': result.fileName,
// 'parseErrors': result.parseErrors,
// 'file': result.file,
// 'size': result.size