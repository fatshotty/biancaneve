const { isMainThread } = require('worker_threads');
const FS = require('fs');
const Path = require('path');
const Logger = require('../logger');
const {exec_thread, convertSecToMinsHours} = require('../utils');
const {extractVideoData, extractFanart, extractMetadata} = require('../steps/ffprobe');

const Log = new Logger('ffmpeg');


async function start({CONFIG, args, data}) {

  const res = {}

  if (args.metadata) {
    res.video = await extractVideoData(data.file);
  }

  if ( args.screens ) {
    res.screens = await generateScreenshots({CONFIG, args, data});
  }

  return res;

}



async function generateScreenshots({CONFIG, args, data}) {
  const metadata = await extractMetadata(data.file);

  const dur = parseInt( metadata.format.duration );

  Log.info('video duration is', dur);

  // 100 : dur = 5 : x
  const perc5 = parseInt( (dur * 5) / 100 );
  const perc95 = parseInt( (dur * 95) / 100 );

  const percTotal = perc95 - perc5;

  Log.info('range', perc5, perc95, '=', percTotal);

  const n_screen = args.n_screens || 4;
  const perc_screen = parseInt(100 / n_screen);
  Log.debug('percentage of each screens:', perc_screen);

  const secs = []
  for ( let i = 1; i <= n_screen; i++ ) {

    const step = (perc_screen * i);
    const step_total = (percTotal * step);
    const step_perc = ( step_total/ 100);
    const step_shift = step_perc + perc5;

    const sec = parseInt( step_shift );
    const conv = convertSecToMinsHours(sec);
    Log.info('screen', i, ':', sec);
    Log.debug( `${conv.hours}:${conv.minutes}:${conv.seconds}`);
    secs.push( `${conv.hours}:${conv.minutes}:${conv.seconds}` );
  }

  Log.log('total screen', secs)

  return await extractFanart(data.file, secs);

}



function exec(fork, data) {

  return exec_thread(fork, start, __filename, data);

}

if ( !isMainThread) {
  Log.debug('starting thread');
  exec();
}

module.exports = {exec};
