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


module.exports = {mkdir, stringToLIT, cleanString, exec_thread};
