module.exports = {
    loadLastFile: function () {
        loadLastFileInternal();
    }
  };

function loadLastFileInternal() {
    var lastFile = store.get('vocabularyFileName');

    if (lastFile !== '') {
        log.info('Loading last file %s', lastFile);
        parseCSV(lastFile);
    } else {
        log.info('No file to load %s', lastFile);
    }
}


// load CSV File
function loadCSVFileInternal() {
    log.info("Opening Dialog ..");

    dialog.showOpenDialog(//{properties: ['openFile', 'openDirectory', 'multiSelections']});
        {
            filters: [
                { name: 'Vocabulary Files CSV', extensions: ['csv'] }
            ]
        }, function (fileNames) {
            if (fileNames === undefined) return;

            const fileName = fileNames[0];
            const fileDir = path.parse(fileName).dir;
            log.info(fileDir);

            parseCSV(fileName);

        });
}


// load CSV File
function loadCSVFile() {
    log.info("Opening Dialog ..");

    dialog.showOpenDialog(//{properties: ['openFile', 'openDirectory', 'multiSelections']});
        {
            filters: [
                { name: 'Vocabulary Files CSV', extensions: ['csv'] }
            ]
        }, function (fileNames) {
            if (fileNames === undefined) return;

            const fileName = fileNames[0];
            const fileDir = path.parse(fileName).dir;
            log.info(fileDir);

            parseCSV(fileName);

        });
}

// parse csv
function parseCSV(fileName) {
    log.info("About to load" + fileName);

    fs.readFile(fileName, 'utf-8', function (err, data) {
        if (err) return log.info("parseCSV:", err);
        // data is the contents of the text file we just read
        //  log.info(data);

        parse(data, {
            delimiter: ';',
            relax_column_count: true,
            columns: ['word', 'translation', 'phase','lastAsked']
        }, function (err, output) {
            //  log.info("****** Parsed Start:")
            //  log.info(err);
            // log.info(output);
            //  log.info("****** Parsed End")

            // special handling for our format
            result = specialParse(output);
            activeVocabulary = result.voc;

            const file = path.parse(fileName).name + path.parse(fileName).ext;
            result.fileName = fileName;
            result.file = file;
            result.size = activeVocabulary.length;

            log.info("****** Parsed End");
            fileLoaded(result)
        });

        // mainWindow.webContents.
    });
}


function specialParse(data) {
    var result = {};
    var vocs = [];
    var parseProblems = [];
    for (var i = 0; i < data.length; i++) {
        var entry = {};
        var parseError = {};
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
            log.info("Translation is missing for %s", word);
            translation = "MISSING";
            parseError.word = word;
            parseError.error = "Missing Translation, no semicolon"
            parseError.raw = data[i].word;
            parseError.row = i;

            parseProblems.push(parseError);
        }
        entry.word = word;
        entry.translation = translation;
        //     log.info(entry);
        vocs.push(entry);
    }
    // log.info('**************');
    //   log.info(vocs);
    result.voc = vocs;
    result.parseErrors = parseProblems;
    return result;
}

function fileLoaded(result) {
    log.info("[MAIN] fileLoaded %s Words:%s", result.file, result.size);
    // store globally
    testRunData = {
        'error': 0,
        'total': result.size,
        'correct': 0,
        'currentIndex': 0,  // index to ask
        'word': '<No Data>',  // the word to ask
        'correctTranslation': '<No Data>',  // the translation at index
        'answerIsCorrect': false,  // used to check if the answer is correct
        'currentCount': 0, // counter for current run
        'grade': 0, // initial grade
        'targetCount': 0,  // target counter for this run
        'type': '<No Data>',
        'started' : "jetzt",
        'fileName': result.fileName,
        'parseErrors': result.parseErrors,
        'file': result.file,
        'size': result.size
    }
    //log.debug(stats.fil);
    // store last file if it was read successfull
    store.set('vocabularyFileName', result.fileName);
    sendStats();
}
