const cors = require("cors");
const https = require("https");
const bodyParser = require("body-parser");
const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
const { exec } = require("child_process");
const request = require("request");
const ffmpeg = require("fluent-ffmpeg");
const app = express();
const PORT = 8080;

let chunks = 40;
let title = null;
let vurl = null;
let aurl = null;
let aformat = null;
let vformat = null;
let complete = false;
let vsize = null;
let asize = null;
let promises = [];


app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var server = app.listen(process.env.PORT || 8081, () =>
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
  aformat = req.body.aformat;
  vformat = req.body.vformat;
  promises = [];
  console.log(aurl);
  console.log(vurl);

  getUrlSize(vurl, aurl, res);
});

app.post("/check", (req, res) => {
  res.send(complete);
});

function youtubeStart(url, res) {
  ytdl.getInfo(url).then((response) => {
    showDetails(response, res);
  });
}

function getUrlSize(vurl, aurl, res) {
  complete = false;
  let req = request(vurl, { method: "HEAD" }, function (err, res, body) {
    vsize = Number(res.headers["content-length"]);
    console.log(vsize);
    let req1 = request(aurl, { method: "HEAD" }, function (err, res, body) {
      asize = Number(res.headers["content-length"]);
      console.log(asize);
      calculateChunkSize("video", vurl);
      calculateChunkSize("audio", aurl);
      checkCompletion();
    });
    req1.end();
  });
  req.end();
  res.send('started');
}
function calculateChunkSize(type, url) {
  let file_name = null;
  let chunksize = 0;
  if (type == "video") {
    chunksize = Math.floor(vsize / chunks);
  } else if (type == "audio") {
    chunksize = Math.floor(asize / chunks);
  }
  let start = 0;
  let end = chunksize;
  let i = 0;
  for (i = 0; i < chunks - 1; i++) {
    downloadFunc(start, end, url, i + 1, type);
    start += chunksize + 1;
    end = start + chunksize;
  }
  i++;
  if (type == "video") {
    end = vsize;
  }
  if (type == "audio") {
    end = asize;
  }
  downloadFunc(start, end, url, i, type);
}

function checkCompletion() {
  console.log(promises.length);
  Promise.all(promises).then(function () {
    console.log("done");
    promises = [];
    conactenate("video");
    conactenate("audio");
    Promise.all(promises).then(function () {
      console.log("done");
      joinAandV();
    });
  });
}

function downloadFunc(start, end, url, i, type) {
  // console.log(i + ". " + type + " " + start + " ---> " + end);
  let vfile = null;
  let afile = null;

  if (type == "video") {
    vfile = fs.createWriteStream("./downloads/video.part" + i);
    promises.push(
      new Promise(function (resolve, reject) {
        https.get(
          url,
          { headers: { range: "bytes=" + start + "-" + end + "" } },
          function (response) {
            let vstream = response.pipe(vfile);
            vstream.on("finish", function () {
              resolve("vdone");
              // console.log(i + ". finished: " + start + " --> " + end);
            });
          }
        );
      })
    );
  } else if (type == "audio") {
    afile = fs.createWriteStream("./downloads/audio.part" + i);
    promises.push(
      new Promise(function (resolve, reject) {
        https.get(
          url,
          { headers: { range: "bytes=" + start + "-" + end + "" } },
          function (response) {
            let astream = response.pipe(afile);
            astream.on("finish", function () {
              resolve("vdone");
              // console.log(i + ". finished: " + start + " --> " + end);
            });
          }
        );
      })
    );
  }
}
function conactenate(type) {
  let cat = "cat ";
  if (type == "video") {
    for (i = 1; i <= chunks; i++) {
      cat += " downloads/video.part" + i;
    }
    cat += " > downloads/video." + vformat;
  } else if (type == "audio") {
    for (i = 1; i <= chunks; i++) {
      cat += " downloads/audio.part" + i;
    }
    cat += " > downloads/audio." + aformat;
  }
  promises.push(
    new Promise(function (resolve, reject) {
      exec(cat, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return;
        }
        for (i = 1; i <= chunks; i++) {
          fs.unlink("./downloads/" + type + ".part" + i, (err) => {
            if (err) throw err;
          });
        }
        resolve("concat done");
      });
    })
  );
}

function joinAandV() {
  ffmpeg("./downloads/video." + vformat)
    .input("./downloads/audio." + aformat)
    .audioCodec("copy")
    .videoCodec("copy")
    .on("error", function (err) {
      console.log("An error occurred: " + err.message);
      complete = 'error';
    })
    .on("end", function () {
      console.log("Processing finished !");
      complete = true;
      fs.unlink("./downloads/audio." + aformat, (err) => {
        if (err) throw err;
        // console.log("old audio file was deleted");
      });
      fs.unlink("./downloads/video." + vformat, (err) => {
        if (err) throw err;
        // console.log("old audio file was deleted");
      });
      title1 = encodeURIComponent(title);
      title1 = escape(title1);
      app.get("/download/" + title1 + ".mkv", (req, res) =>
        res.download("./downloads/" + title + ".mkv")
      );
    })
    .save("./downloads/" + title + ".mkv");
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
  // console.log(result);
  res.send(result);
}
