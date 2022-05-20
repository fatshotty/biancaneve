const { isMainThread } = require('worker_threads');
const FS = require('fs');
const Path = require('path');
const Logger = require('../logger');
const {exec_thread} = require('../utils');
const Pug = require('pug');
const FileSytem = require('../steps/filesystem');

const Log = new Logger('PUG');

async function start({CONFIG, args, data}) {

  const templateFolder = Path.resolve(CONFIG.TemplatesPath)
  const files = await FileSytem.listAllFiles(templateFolder, `${data.TYPE}-*.pug`);


  for await ( let file of files ) {

    Log.info('processing template', file);

    let filename = Path.basename( file.substring( `${data.TYPE}-`.length ), '.pug');

    const destination = Path.resolve(data.folder, `${filename || data.TYPE}.html`);

    Log.info('template will be:', `${filename || data.TYPE}.html`);

    const str = Pug.renderFile( Path.resolve(templateFolder, file), data);
    Log.debug('template to be generated:', str.substring(0, 100))

    FS.writeFileSync( destination, str, 'utf-8');
    Log.info('template generated:', destination )

  }

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
