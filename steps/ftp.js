const FS = require('fs');
const Path = require('path');
const FTP = require('ftp');
const Logger = require('../logger');
const {bytesToSize} = require('../utils');

const FtpClient = new FTP();

FtpClient.on('error', (err) => {
  Log.error('CONNECTION ERROR', err);
});


const Log = new Logger('FTPClient');

function login({host, port, user, password}) {
  return new Promise((resolve, reject) => {
    FtpClient.once('error', (err) => {
      reject(err);
    });

    FtpClient.once('ready', () => {
      Log.info('authentication success as', user);
      resolve();
    });

    Log.info('connecting to', `${host}:${port}`, 'as', user, 'w/ pass');
    FtpClient.connect({
      host,
      port,
      user,
      password,
      connTimeout: 5000,
      pasvTimeout: 5000,
      keepalive: 5000
    });
  });
}


async function uploadFiles(folder, files) {

  Log.info('try to upload files into root folder');

  for await (let file of files) {
    await uploadSingleFile( Path.join(folder, file) );
  }
}


async function uploadSingleFile(file) {
  return new Promise((resolve, reject) => {
    const destFilename = Path.basename(file);
    Log.info('uploading', file, 'as', destFilename);

    let amount = 0;
    let timer = setInterval(() => {
      Log.debug('uploaded', destFilename, ':', bytesToSize(amount));
    }, 7000);

    const readStream = FS.createReadStream(file);
    
    readStream.on('data', (chunk) => {
      amount += chunk.length;
    });

    FtpClient.put( readStream, destFilename, (err) => {
      clearInterval(timer);

      if ( err ) {
        Log.error(err);
        return reject(err);
      }
      Log.info(destFilename, bytesToSize(amount), 'uploaded!');
      resolve();
    })
  });
}


async function close() {
  Log.info('closing client');
  return FtpClient.end();
}

module.exports = {login, uploadFiles, uploadSingleFile, close}
