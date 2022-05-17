const { isMainThread } = require('worker_threads');
const FS = require('fs');
const Path = require('path');
const Logger = require('../logger');
const {exec_thread} = require('../utils');
const {execRar, execRev} = require('../steps/filesystem');
const Log = new Logger('rar');

async function start({CONFIG, args, data}) {

  let pwd = args.password;

  const rarFiles = await execRar(data.file, Path.join(data.folder, data.fileLit), pwd);

  let revFiles = [];
  if ( args.rev ) {
    revFiles = await execRev(Path.join(data.folder, rarFiles[0]));
  }

  return {rar: rarFiles, rev: revFiles};
}

function exec(fork, data) {
  return exec_thread(fork, start, __filename, data);
}

if ( !isMainThread) {
  Log.debug('starting thread');
  exec();
}

module.exports = {exec};
