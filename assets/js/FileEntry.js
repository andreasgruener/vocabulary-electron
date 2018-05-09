const electron = require('electron');
const log = require('electron-log');


class FileEntry {
    constructor(opts) {
        this.shortName = opts.shortName;
        this.fileName = opts.fileName;
        this.p0 = opts.p0;
        this.p1 = opts.p1;
        this.p2 = opts.p2;
        this.p3 = opts.p3;
        this.p4 = opts.p4;
        this.p5 = opts.p5;
        this.phaseRelevant = opts.phaseRelevant;
        this.total = opts.total;
    }
    printStatus() {
        log.info("[FEST] Name=%s, TOTAL_QUESTIONS=%s, PhaseRelevent=%s Phases: %s - %s - %s - %s - %s - %s ",
            this.fileName, this.total,this.phaseRelevant, this.p0, this.p1, this.p2, this.p3, this.p4, this.p5);
    }
}


// expose the class
module.exports = FileEntry;