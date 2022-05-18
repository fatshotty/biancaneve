const Path = require('path');
const FS = require('fs');

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const SUB = {"a":"4","b":"8","e":"3","g":"6","i":"1","o":"0","q":"9","s":"5","t":"7","z":"2"};
const LETTERS = Object.keys(SUB);
const REGEXP = new RegExp(`[${LETTERS.join()}]`,'ig');


function mkdir(parent, dir, skipError) {

  const path = Path.join(parent, dir);

  if ( !FS.existsSync(path) ) {
    try {
      FS.mkdirSync(path);
    } catch(e) {
      if ( !skipError ) throw e;
    }
  }

  return path;

}


function stringToLIT(str) {
  const converted = str.replace(REGEXP, (letter) => {
    return SUB[ letter.toLowerCase() ];
  });
  return converted
}


function cleanString(str) {
  return str.replace(/[^\w|\s]/g, '').replace( /\s\s+/gi, ' ').trim();
}


function convertSecToMinsHours(value) {
  const sec = parseInt(value, 10); // convert value to number if it's string
  let hours   = Math.floor(sec / 3600); // get hours
  let minutes = Math.floor((sec - (hours * 3600)) / 60); // get minutes
  let seconds = sec - (hours * 3600) - (minutes * 60); //  get seconds
  // add 0 if value < 10; Example: 2 => 02
  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return {
    hours,
    minutes,
    seconds
  };
}


function exec_thread(fork, callback, filename, data) {
  if ( isMainThread ) {

    if ( fork ) {

      return new Promise( (resolve, reject) => {
        const worker = new Worker(filename, {workerData: data});
        worker.once('message', (message) => {
          resolve(message);
        });
        worker.once('exit', (code) => {
          if ( code != 0 ) reject();
        })
      })

    } else {

      return callback(data);

    }

  } else {
    return callback(workerData).then( (response) => {
      parentPort.postMessage( response );
    }).catch( (err) => {
      parentPort.postMessage( err.message );
      process.exit(1);
    });
  }
}


function bytesToSize(bytes) {
  var sizes = ['b', 'kb', 'mb', 'gb', 'tb'];
  if (bytes == 0) return '0 b';
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}


module.exports = {mkdir, stringToLIT, cleanString, exec_thread, convertSecToMinsHours, bytesToSize};
