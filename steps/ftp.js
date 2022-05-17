const FS = require('fs');
const Path = require('path');
const FTP = require('ftp');
const Logger = require('../logger');

const FtpClient = new FTP();



const Log = new Logger('FTPClient');


function login({host, port, user, password}) {
  return new Promise((resolve, reject) => {
    FtpClient.once('error', (err) => {
      Log.error('cannot connect', err);
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
      password
    });
  });
}


async function creteFolder(name, year) {

}


async function moveToFolder(name) {

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
    FtpClient.put( FS.createReadStream(file), destFilename, (err) => {
      if ( err ) {
        Log.error(err);
        return reject(err);
      }
      Log.info(destFilename, 'uploaded!');
      resolve();
    })
  });
}


async function close() {
  Log.info('closing client');
  return FtpClient.end();
}

module.exports = {login, uploadFiles, uploadSingleFile, close}
