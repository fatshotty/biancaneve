const FS = require('fs');
const Path = require('path');
const {Config} = require('../configuration');
const {promisify} = require('util');
const FFMPEG = require('fluent-ffmpeg');
const ChildProcess = require("child_process");

const Logger = require('../logger');

const Log = new Logger('FFProbe');


async function extractVideoData(file) {
  Log.info('start analyzing file with avinaptic');

  const proc = ChildProcess.spawn("avinaptic2-cli", ['--drf', file]);

  let timer = setInterval(() => {
    Log.info('analyzing video file...');
  }, 5000);

  const outputData = [];

  proc.stdout.on("data", data => {
    outputData.push( data.toString() );
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
        const report = outputData.join('\n');
        Log.debug(report)
        return resolve(report);
      }
    });
  });
}


async function extractFanart(file) {
  const folder = Path.dirname(file);
  return new Promise( (resolve, reject) => {

    let timer = setInterval(() => {
      Log.info('extracting screenshots...');
    }, 5000);

    let screenfiles = [];
    FFMPEG(file)
      .on('filenames', function(filenames) {
        Log.debug('Will generate ' + filenames.join(', '))
        screenfiles = filenames.map(f => Path.join(folder, f));
      })
      .on('end', function() {
        Log.info('Screenshots taken');
        clearInterval(timer);
        resolve(screenfiles);
      })
      .screenshots({
        // Will take screens at percentage of video file
        count: Config.NumberOfScreenshots,
        folder: folder
      }).on('error', function(err, stdout, stderr) {
        Log.error(stdout, stderr);
        clearInterval(timer);
        reject(err);
      });
  })
}


module.exports = {extractVideoData, extractFanart};
