const FS = require('fs');
const Path = require('path');
const {Config} = require('../configuration');
const {promisify} = require('util');
const FFMPEG = require('fluent-ffmpeg');
const ChildProcess = require("child_process");

const Logger = require('../logger');

const Log = new Logger('FFProbe');


async function extractMetadata(file) {
  const probe = promisify(FFMPEG.ffprobe);
  return await probe(file);
}


async function extractVideoData(file) {
  Log.info('start analyzing file with avinaptic');

  const proc = ChildProcess.spawn("avinaptic2-cli", ['--drf', file]);

  let timer = setInterval(() => {
    Log.info('analyzing video file...');
  }, 5000);

  let outputData = [];

  proc.stdout.on("data", data => {
    outputData = data.toString().split('\n');
  });

  proc.stderr.on("data", data => {
    Log.error(`AVINAPTIC: ${data}`);
  });

  proc.on('error', (error) => {
    Log.error(`AVINAPTIC: ${error.message}`);
  });

  return new Promise( (resolve, reject) => {
    proc.on("close", code => {
      clearInterval(timer);
      Log.info(`AVINAPTIC process exited with code ${code}`);
      if ( code > 0 ) {
        reject();
      } else {
        outputData.shift();
        const report = outputData.join('\n');
        Log.debug(report)
        return resolve(outputData);
      }
    });
  });
}


async function extractFanart(file, times) {
  Log.info('start generating screenshots with ffmpeg');

  // ffmpeg -ss 00:06:18 -i test.mkv -frames:v 1 -q:v 2 output1.jpg
  const res = [];

  for await ( let [i, time] of times.entries() ) {
    const screen_name = `screen_${i + 1}.png`;
    await execFFmpegFanart(file, time, screen_name);
    res.push( screen_name );
  }
  return res;
}


async function execFFmpegFanart(file, time, output) {
  Log.info('exec ffmpeg for taking screenshot at', time);

  const proc = ChildProcess.spawn("ffmpeg", ['-ss', time, '-i', file, '-frames:v', '1', '-q:v', '2', output], {cwd: Path.dirname(file)});

  let timer = setInterval(() => {
    Log.info('taking screenshot at', time);
  }, 5000);

  proc.stdout.on("data", data => {
  });

  proc.stderr.on("data", data => {
    // Log.error(`FFMPEG: ${data}`);
  });

  proc.on('error', (error) => {
    Log.error(`FFMPEG: ${error.message}`);
  });

  return new Promise( (resolve, reject) => {
    proc.on("close", code => {
      clearInterval(timer);
      Log.info(`FFMPEG process exited with code ${code}`);
      if ( code > 0 ) {
        reject();
      } else {
        resolve();
      }
    });
  });
}


module.exports = {extractMetadata, extractVideoData, extractFanart, execFFmpegFanart};
