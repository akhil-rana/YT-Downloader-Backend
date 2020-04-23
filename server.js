const cors = require("cors");
const https = require("https");
const bodyParser = require("body-parser");
const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
const request = require("request");
const ffmpeg = require("fluent-ffmpeg");
const app = express();
// const readline = require("readline-sync");
const PORT = 8080;
let title = null;
let downloaded = false;
let vurl = null;
let aur = null;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var server = app.listen(process.env.PORT || 8080, () =>
  console.log("App listening on port " + PORT)
);
app.post("/urlstart", (req, res) => {
  let url = req.body.url;
  console.log(url);
  youtubeStart(url, res);
});

app.post("/video", (req, res) => {
  aurl = req.body.aurl;
  vurl = req.body.vurl;
  let aformat = req.body.aformat;
  let vformat = req.body.vformat;
  downloadFile(aurl, vurl, aformat, vformat, res);
});

app.get("/check", (req, res) => {
  checkDownloadProgress(res);
});

function youtubeStart(url, res) {
  ytdl.getInfo(url).then((response) => {
    showDetails(response, res);
  });
}

function showDetails(info, res) {
  title = info.player_response.videoDetails.title;
  let vcodecs = [];
  let acodecs = [];
  let aurls = [];
  let vurls = [];
  let vformats = [];
  let aformats = [];

  for (i = 1; i < info.formats.length; i++) {
    if (info.formats[i].mimeType.substring(0, 5) == "video") {
      vcodecs.push(
        info.formats[i].codecs + "  |  " + info.formats[i].height + "p"
      );
      vformats.push(
        info.formats[i].mimeType.substring(
          6,
          info.formats[i].mimeType.indexOf(";")
        )
      );
      vurls.push(info.formats[i].url);
    } else if (info.formats[i].mimeType.substring(0, 5) == "audio") {
      aurls.push(info.formats[i].url);
      if (
        info.formats[i].mimeType.substring(
          6,
          info.formats[i].mimeType.indexOf(";")
        ) == "mp4"
      ) {
        aformats.push("m4a");
      } else {
        aformats.push(
          info.formats[i].mimeType.substring(
            6,
            info.formats[i].mimeType.indexOf(";")
          )
        );
      }
      acodecs.push(
        info.formats[i].codecs + "  |  " + info.formats[i].audioBitrate + "Kbps"
      );
    }
  }
  let result = {
    name: title,
    vcodecs: vcodecs,
    acodecs: acodecs,
    aurls: aurls,
    vurls: vurls,
    aformats: aformats,
    vformats: vformats,
  };
  console.log(result);
  res.send(result);
  // downloadFile(title, url, formats, res);
}

function downloadFile(aurl, vurl, aformat, vformat, res) {
  let vfile = fs.createWriteStream("./downloads/video." + vformat);
  let afile = fs.createWriteStream("./downloads/audio." + aformat);
  downloaded = false;

  res.send("Started");
  let vdown = new Promise(function (resolve, reject) {
    https.get(vurl, function (response) {
      let vstream = response.pipe(vfile);
      vstream.on("finish", function () {
        resolve("vdone");
      });
    });
  });
  let adown = new Promise(function (resolve, reject) {
    https.get(aurl, function (response) {
      let astream = response.pipe(afile);
      astream.on("finish", function () {
        resolve("adone");
      });
    });
  });

  Promise.all([vdown, adown]).then(function () {
    ffmpeg("./downloads/video." + vformat)
      .input("./downloads/audio." + aformat)
      .audioCodec("copy")
      .videoCodec("copy")
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
      })
      .on("end", function () {
        console.log("Processing finished !");

        fs.unlink("./downloads/video." + vformat, (err) => {
          if (err) throw err;
          console.log("Video file was deleted");
        });
        fs.unlink("./downloads/audio." + aformat, (err) => {
          if (err) throw err;
          console.log("Audio file was deleted");
        });
        title1 = encodeURIComponent(title);
        app.get("/download/" + title1 + ".mkv", (req, res) =>
          res.download("./downloads/" + title + ".mkv")
        );
      })
      .save("./downloads/" + title + ".mkv");
  });
}

function checkDownloadProgress(res) {
  let title1 = encodeURIComponent(title);
  request(
    {
      url: vurl,
      method: "HEAD",
      headers: {
        'access-control-allow-origin': '*',
        'access-control-expose-headers': 'access-control-allow-origin',
      }
    },
    function (err, response, body) {
      console.log(response.headers);
    }
  );
}
