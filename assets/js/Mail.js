module.exports = {
    sendMail: function (data) {
      return sendMailInternal(data);
    }
  };

// code

const nodemailer = require('nodemailer');
const log = require('electron-log');

log.debug("***********************");

function sendMailInternal(testRunData) {
    log.debug("--- MAIL --- Connected");
    let transporter = nodemailer.createTransport({
        host: 'send.one.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: "vokabel-trainer@akkga.com",
            pass: "C3kaa446rm"
        }
    });
    log.debug("--- MAIL --- Connected");

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"vokabel-trainer@akkga.com', // sender address
        to: 'andreas.gruener@akkga.com', // list of receivers
        subject: 'Hello ✔', // Subject line
        text: getInfoMail(testRunData), // plain text body
        html: getInfoMailHTML(testRunData) // html body
    };


    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return log.error(error);
        }
        log.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        log.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });
}


// info mail

function getInfoMail(testData) {
    var falscheFragenText = "unknown";
    var richtigeFragenText = "unknown";
    var info =
        "Vokabeltrainer\n" +
        "\n" +
        "Gestartet am:\t" + testData.started + "\n" +
        "Beginn:\t\t" + testData.started + "\n" +
        "Ende:\t\t" + testData.finished + "\n" +
        "Note:\t\t" + testData.grade + "\n" +
        "Dauer:\t\t" + testData.started + " Sekunden\n" +
        "Benutzer:\t\t" + currentUser + "\n" +
        "Vokabeln:\t" + testData.targetCount + "\n" +
        "Davon Falsch:\t\t" + testData.error + "\n" +
        "Abfrageart:\t\t" + testData.type + "\n" +
        "Vokabeldatei\t\t" + testData.file + "\n" +
        "\n";

    info = info + "\nFalsch beantwortet:" + falscheFragenText + "\n\n\nRichtig beantwortet: " + richtigeFragenText
    return info;
}
function getInfoMailHTML(testData) {
    var falscheFragenTextHTML = "unknown";
    var richtigeFragenTextHTML = "unknown";
    var infoHTML =
        "<h1>Vokabeltrainer :: " + currentUser + " :: " + testData.type + "</h1>" +
        "<table>" +
        "<tr><td>Gestartet am:</td><td><b>" + testData.started + "</b></td></tr>" +
        "<tr><td>Beginn:</td><td><b>" + testData.started + "</b></td></tr>" +
        "<tr><td>Ende:</td><td><b>" + testData.finished + "</b></td></tr>" +
        "<tr><td>Note:</td><td style=\"color: #FF0000 !important;\"><b>" + testData.grade + "</b></td></tr>" +
        "<tr><td>Dauer:</td><td><b>" + testData.started + " Sekunde/n</b></td></tr>" +
        "<tr><td>Benutzer:</td><td><b>" + currentUser + "</b></td></tr>" +
        "<tr><td>Vokabeln:</td><td><b>" + testData.targetCount + "</b></td></tr>" +
        "<tr><td>Davon Falsch:</td><td><b>" + testData.error + "</b></td></tr>" +
        "<tr><td>Abfrageart:</td><td><b>" + testData.type + "</b></td></tr>" +
        "<tr><td>Vokabeldatei</td><td><b>" + testData.file + "</b></td></tr>" +
        "</table>";
    infoHTML = css + infoHTML + "<h2>Falsch beantwortet:</h2>" + falscheFragenTextHTML + "<h2>Richtig beantwortet:</h2> " + richtigeFragenTextHTML
    return infoHTML;
}

// mail template

var css = `
<style type="text/css">
body {
	font: normal 11px auto "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif;
	color: #4f6b72;
	background: #E6EAE9;
}

a {
	color: #c75f3e;
}

#mytable {
	width: 700px;
	padding: 0;
	margin: 0;
}

caption {
	padding: 0 0 5px 0;
	width: 700px;	 
	font: italic 11px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif;
	text-align: right;
}

th {
	font: bold 11px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif;
	color: #4f6b72;
	border-right: 1px solid #C1DAD7;
	border-bottom: 1px solid #C1DAD7;
	border-top: 1px solid #C1DAD7;
	letter-spacing: 2px;
	text-transform: uppercase;
	text-align: left;
	padding: 6px 6px 6px 12px;
	background: #CAE8EA url(images/bg_header.jpg) no-repeat;
}

th.nobg {
	border-top: 0;
	border-left: 0;
	border-right: 1px solid #C1DAD7;
	background: none;
}

td {
	border-right: 1px solid #C1DAD7;
	border-bottom: 1px solid #C1DAD7;
	background: #fff;
	padding: 6px 6px 6px 12px;
	color: #4f6b72;
}


td.alt {
	background: #F5FAFA;
	color: #797268;
}

th.spec {
	border-left: 1px solid #C1DAD7;
	border-top: 0;
	background: #fff url(images/bullet1.gif) no-repeat;
	font: bold 10px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif;
}

th.specalt {
	border-left: 1px solid #C1DAD7;
	border-top: 0;
	background: #f5fafa url(images/bullet2.gif) no-repeat;
	font: bold 10px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif;
	color: #797268;
}
</style>
`
var css1 = `
<style type="text/css">
table a:link {
	color: #666;
	font-weight: bold;
	text-decoration:none;
}
table a:visited {
	color: #999999;
	font-weight:bold;
	text-decoration:none;
}
table a:active,
table a:hover {
	color: #bd5a35;
	text-decoration:underline;
}
table {
	font-family:Arial, Helvetica, sans-serif;
	color:#666;
	font-size:12px;
	text-shadow: 1px 1px 0px #fff;
	background:#eaebec;
	margin:20px;
	border:#ccc 1px solid;

	-moz-border-radius:3px;
	-webkit-border-radius:3px;
	border-radius:3px;

	-moz-box-shadow: 0 1px 2px #d1d1d1;
	-webkit-box-shadow: 0 1px 2px #d1d1d1;
	box-shadow: 0 1px 2px #d1d1d1;
}
table th {
	padding:21px 25px 22px 25px;
	border-top:1px solid #fafafa;
	border-bottom:1px solid #e0e0e0;

	background: #ededed;
	background: -webkit-gradient(linear, left top, left bottom, from(#ededed), to(#ebebeb));
	background: -moz-linear-gradient(top,  #ededed,  #ebebeb);
}
table th:first-child {
	text-align: left;
	padding-left:20px;
}
table tr:first-child th:first-child {
	-moz-border-radius-topleft:3px;
	-webkit-border-top-left-radius:3px;
	border-top-left-radius:3px;
}
table tr:first-child th:last-child {
	-moz-border-radius-topright:3px;
	-webkit-border-top-right-radius:3px;
	border-top-right-radius:3px;
}
table tr {
	text-align: center;
	padding-left:20px;
}
table td:first-child {
	text-align: left;
	padding-left:20px;
	border-left: 0;
}
table td {
	padding:18px;
	border-top: 1px solid #ffffff;
	border-bottom:1px solid #e0e0e0;
	border-left: 1px solid #e0e0e0;

	background: #fafafa;
	background: -webkit-gradient(linear, left top, left bottom, from(#fbfbfb), to(#fafafa));
	background: -moz-linear-gradient(top,  #fbfbfb,  #fafafa);
}
table tr.even td {
	background: #f6f6f6;
	background: -webkit-gradient(linear, left top, left bottom, from(#f8f8f8), to(#f6f6f6));
	background: -moz-linear-gradient(top,  #f8f8f8,  #f6f6f6);
}
table tr:last-child td {
	border-bottom:0;
}
table tr:last-child td:first-child {
	-moz-border-radius-bottomleft:3px;
	-webkit-border-bottom-left-radius:3px;
	border-bottom-left-radius:3px;
}
table tr:last-child td:last-child {
	-moz-border-radius-bottomright:3px;
	-webkit-border-bottom-right-radius:3px;
	border-bottom-right-radius:3px;
}
table tr:hover td {
	background: #f2f2f2;
	background: -webkit-gradient(linear, left top, left bottom, from(#f2f2f2), to(#f0f0f0));
	background: -moz-linear-gradient(top,  #f2f2f2,  #f0f0f0);	
}
</style>
`
