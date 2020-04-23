const cors = require("cors");
const https = require("https");
const bodyParser = require("body-parser");
const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const puppeteer = require("puppeteer");
const app = express();
const readline = require("readline-sync");
const PORT = 8080;
let title = null;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve only the static files form the dist directory
app.use(express.static(__dirname + "/front"));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/front/index.html"));
});

var server = app.listen(process.env.PORT || 8080, () =>
  console.log("App listening on port " + PORT)
);

app.post("/urlstart", (req, res) => {
  let url = req.body.url;
  console.log(url);
  youtubeStart(url, res);
});
app.post("/video", (req, res) => {
  let aurl = req.body.aurl;
  let vurl = req.body.vurl;
  let aformat = req.body.aformat;
  let vformat = req.body.vformat;
  //   downloadP(vurl);
  downloadFile(aurl, vurl, aformat, vformat, res);
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
  res.send(result);
  // downloadFile(title, url, formats, res);
}

function downloadFile(aurl, vurl, aformat, vformat, res) {
  let vfile = fs.createWriteStream("./downloads/video." + vformat);
  let afile = fs.createWriteStream("./downloads/audio." + aformat);

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
        app.get("/" + title1 + ".mkv", (req, res) =>
          res.download("./downloads/" + title + ".mkv")
        );
        res.send("Download from: " + "/" + title1 + ".mkv");
      })
      .save("./downloads/" + title + ".mkv");
  });
}