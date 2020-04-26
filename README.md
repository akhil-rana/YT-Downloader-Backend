# YoutubeDL-Backend

A nodeJS utility for dowloading youtube videos using [ytdl-core](https://github.com/fent/node-ytdl-core) and [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) with the following features:
- Chunk files download by spliting the files into multiples parts all on the server hence bypassing Youtube's locked download speeds which "sucks" for devs.
- Allowing all the formats/codecs available for doowload with any audio customisation.
- Audio and Video are combined on the server using ffmpeg (required to be installed on the machine).

## To run:
- `npm install`
- `npm start` or `node server.js`

## Requirements
- [NodeJS (npm)](https://nodejs.org/en/)
- [ffmpeg](https://ffmpeg.org/download.html)

### This can be used with the [Frontend](https://github.com/akhil-rana/youtubedl)

Try the hosted version [here](https://myownyoutubedl.herokuapp.com) (Please don't abuse)
