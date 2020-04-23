const cors = require("cors");
const https = require("https");
const bodyParser = require("body-parser");
const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const app = express();
const readline = require("readline-sync");
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
  let vinput = readline.question("Enter the video index: ");
  let vfile = fs.createWriteStream("video." + formats[Number(vinput - 1)]);
  let ainput = readline.question("Enter the audio index: ");
  let afile = fs.createWriteStream("audio." + formats[Number(ainput - 1)]);

  let vdown = new Promise(function (resolve, reject) {
    https.get(url[Number(vinput - 1)], function (response) {
      let vstream = response.pipe(vfile);
      vstream.on("finish", function () {
        resolve("adone");
      });
    });
  });
  let adown = new Promise(function (resolve, reject) {
    https.get(url[Number(ainput - 1)], function (response) {
      let astream = response.pipe(afile);
      astream.on("finish", function () {
        resolve("adone");
      });
    });
  });

  Promise.all([vdown, adown]).then(function () {
    ffmpeg("./video." + formats[Number(vinput - 1)])
      .input("./audio." + formats[Number(ainput - 1)])
      .audioCodec("copy")
      .videoCodec("copy")
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
      })
      .on("end", function () {
        console.log("Processing finished !");
        fs.unlink("./video." + formats[Number(vinput - 1)]);
        fs.unlink("./audio." + formats[Number(ainput - 1)]);
      })
      .save("./output.mkv");
  });
}
