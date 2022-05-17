const { isMainThread } = require('worker_threads');
const FS = require('fs');
const Path = require('path');
const Logger = require('../logger');
const {exec_thread} = require('../utils');
const {extractVideoData, extractFanart} = require('../steps/ffprobe');

const Log = new Logger('ffmpeg');


async function start({CONFIG, args, data}) {

  const res = {}

  if (args.metadata) {
    res.video = await extractVideoData(data.file);
  }

  if ( args.screens ) {
    res.screens = await extractFanart(data.file);
  }

  return res;

}



function exec(fork, data) {

  return exec_thread(fork, start, __filename, data);

}

if ( !isMainThread) {
  Log.debug('starting thread');
  exec();
}

module.exports = {exec};
