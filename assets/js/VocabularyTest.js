const log = require('electron-log');

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

    questions: [],
    wrongAnswers: [],
    correctAnswers: [],
 //   askedIndices: [],
    remainingIndices: [],

    grade: 0,

    type: "N/A",
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
        this.remainingIndices= [];
        this.grade = 0;
        this.type = "N/A";
        this.started = "";
        this.finished = "";
        this.over = false;
    },

    start: function (c, t) {
        log.info("[VT rest count=%s type=%s",c,t)
        this.reset();
        for (var i = 0; i < this.total; i++) {
            this.remainingIndices.push(i);
        }
        this.targetCount = c;
        this.type = t;
        this.started = new Date();
    },
    setVocabulary: function (vd) {
        this.vData = vd;
        this.total = vd.size;
    },
    next: function () {
        log.info("[VT] Next Vocabulary %s : %s ", this.currentIndex, this.targetCount);
        log.warn("[VT] vocabualry check %s - %s of %s",this.total, this.remainingIndices.length, this.targetCount);
      
        if ( this.remainingIndices.length <= 0 || 
            ( this.total - this.remainingIndices.length ) > this.targetCount) {
            log.warn("[VT] all vocabualry asked %s - %s of %s",this.total, this.remainingIndices.length, this.targetCount);
            over = true;
            return;
        }
        var random = Math.floor(Math.random() * Math.floor(this.remainingIndices.length));
        this.currentIndex = this.remainingIndices[random];
        log.debug(this.remainingIndices);
        this.remainingIndices.splice(random,1);
        log.warn("[VT] vocabualry asked radnom=%s, index=%s (%s of %s)",random, this.currentIndex, this.remainingIndices.length, this.targetCount);
        log.debug(this.remainingIndices);
        var entry = this.vData.data[this.currentIndex];
        this.currentEntry = entry;
        log.info("[VT] Next Vocabulary %S : %s ", entry.word, entry.translation);
        return entry;
    },
    check: function (check) {
        this.currentCount++;
        var askedEntry = {
            word : check.word,
            translation : check.translation,
            correct_translation : this.currentEntry.translation
        }
        log.info("[VT] To check %s/%s --> current %s/%s", check.word, check.translation,this.currentEntry.word,this.currentEntry.translation);
        if (check.word == this.currentEntry.word &&
            check.translation == this.currentEntry.translation) {
            this.correct++;
            this.answerIsCorrect = true;
            this.correctAnswers.push(askedEntry);
            log.info("[VT] CORRECT " + this.correctAnswer);
        } else {
            this.error++;
            this.answerIsCorrect = false;
            this.wrongAnswers.push(askedEntry);
            this.correctTranslation = this.currentEntry.translation;
            log.info("[VT] WRONG " + this.correctTranslation);
        }
        return this.answerIsCorrect;
    },
    calcGrade: function () {
        this.finished = new Date();
        this.duration = this.finished.getSeconds() - this.started.getSeconds();
        var percent = (this.error / this.currentCount) * 100
        var gradePercent = percent * 10
        var factor = Math.floor(gradePercent / 75);
        var tgrade = 1 + factor * 0.5
        // log.info("++ Percent %s = %s / %s ", percent, this.error, this.currentCount);
        // log.info("++ Grade %s = 1 + %s *0,5 ", grade, factor);
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