const { isMainThread } = require('worker_threads');
const FS = require('fs');
const Path = require('path');
const Logger = require('../logger');
const {exec_thread} = require('../utils');
const Pug = require('pug');

const Log = new Logger('PUG');

async function start({CONFIG, args, data}) {

  const destination = Path.resolve(data.folder, `${data.fileLit}-post.html`);

  const str = Pug.renderFile( Path.resolve(__dirname, '../templates/movie.pug'), data);
  FS.writeFileSync( destination, str, 'utf-8');

  return true;

}

function exec(fork, data) {
  return exec_thread(fork, start, __filename, data);
}

if ( !isMainThread) {
  Log.debug('starting thread');
  exec();
}

module.exports = {exec};
