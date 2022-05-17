const { isMainThread } = require('worker_threads');
const {exec_thread} = require('../utils');
const Logger = require('../logger');
const FTP = require('../steps/ftp');
const Log = new Logger('FTP');



async function start({CONFIG, args, data}) {

  Log.info('Login on FTP');

  await FTP.login({
    host: CONFIG.Ftp.Host,
    port: CONFIG.Ftp.Port,
    user: CONFIG.Ftp.User,
    password: CONFIG.Ftp.Pass
  });

  Log.info('Login OK, try to upload files');

  const {folder, rar} = data;
  const files = [].concat(rar.rar, rar.rev);

  Log.debug('found', files.length, 'files to upload');
  Log.debug('files', folder, files);

  // await FTP.uploadFiles(folder, files);

  Log.info('upload completed');

  await FTP.close();

};



function exec(fork, data) {
  return exec_thread(fork, start, __filename, data);
}

if ( !isMainThread) {
  Log.debug('starting thread');
  exec();
}
module.exports = {exec};
