const cors = require("cors");
const https = require("https");
const bodyParser = require("body-parser");
const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
const request = require("request");
const app = express();
var readline = require("readline-sync");
const PORT = 8080;
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// var server = app.listen(process.env.PORT || 8080, () =>
//   console.log("App listening on port " + PORT)
// );
ytdl.getInfo("https://www.youtube.com/watch?v=E3LeZNlI0Xg").then((response) => {
  showDetails(response);
});

function showDetails(info) {
  let title = info.player_response.videoDetails.title;
  let url = [];
  let formats = [];
  for (i = 1; i < info.formats.length; i++) {
    if (info.formats[i].mimeType.substring(0, 5) == "video") {
      console.log(
        "[" + i + "]  " + info.formats[i].codecs + "\t" + info.formats[i].height
      );
      url.push(info.formats[i].url);
    } else if (info.formats[i].mimeType.substring(0, 5) == "audio") {
      console.log(
        "[" +
          i +
          "]  " +
          info.formats[i].codecs +
          "\t" +
          info.formats[i].audioBitrate
      );
      url.push(info.formats[i].url);
    }
    formats.push(
      info.formats[i].mimeType.substring(
        6,
        info.formats[i].mimeType.indexOf(";")
      )
    );
  }
  downloadFile(title, url, formats);
}

function downloadFile(name, url, formats) {
  let input = readline.question("Enter the video index: ");
  let file = fs.createWriteStream(name + "." + formats[Number(input - 1)]);
  https.get(url[Number(input - 1)], function (response) {
    response.pipe(file);
  });
  let input1 = readline.question("Enter the audio index: ");
  let file1 = fs.createWriteStream("Audio - "+name + "." + formats[Number(input1 - 1)]);
  https.get(url[Number(input1 - 1)], function (response) {
    response.pipe(file1);
  });
}
