module.exports.VocabularyTest

// code

class VocabularyTest {
    constructor() {
        this.error = 0;
        this.total = 0;
        this.correct = 0;
        this.currentIndex = 0;
        this.word = "N/A";
        this.correctTranslation = 0;
        this.answerIsCorrect = false;
        this.currentCount = 0;
        this.grade = 0;
        this.targetCount = 0;
        this.type = "N/A";
        this.started = 0;
        this.fileName = "N/A";
        this.parseErrors = 0;
        this.file = 0;
        this.size = 0;
    }

    calcGrade() {
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