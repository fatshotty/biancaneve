const FS = require('fs');
const Path = require('path');
const ChildProcess = require("child_process");
const {promisify} = require('util');
const Glob = require('glob');

const Logger = require('../logger');

const Log = new Logger('FileSystem');


const FSCopy = promisify(FS.copyFile);
const FSRename = promisify(FS.rename);

const RES = [
  {name: 'UHD 4k', w: 3840, h : 2160},
  {name: 'FullHD 1080p', w: 1920, h : 1080},
  {name:  'HD 720p', w: 1280, h : 720}
];



function getFileName(path) {
  return Path.basename(path);
}

function getDirName(path) {
  return Path.dirname(path);
}


function getResolution(video) {

  const h = Math.max(video.height, video.coded_height);
  const w = Math.max(video.width, video.coded_width);

  for ( let res of RES) {
    if ( w >= res.w || h >= res.h ) {
      return res.name;
    }
  }

  return `SD ${video.height}p`;

}


function generateNewFilenameMetadata(metadata, releaserName) {

  const video = metadata.streams.find(s => s.codec_type == 'video');
  const audios = metadata.streams.filter(s => s.codec_type == 'audio');

  const langs = audios.map((a) => {
    const comp = [];
    if ( a.tags ) {
      if ( a.tags.language ) {
        comp.push( a.tags.language.toUpperCase() );
      } else if ( a.tags.title ) {
        const s = a.tags.title.split(',')[0];
        if ( s ) {
          comp.push( s.trim().toUpperCase() );
        }
      }
    }
    comp.push( (a.codec_name || '').toUpperCase() );

    return comp.filter(Boolean).join('-');
  }).join(' ');

  const subs = metadata.streams.filter(s => s.codec_type.indexOf('subtitle') > -1 || s.codec_type.indexOf('text') > -1);

  const lang_subs = [ ... (new Set(subs.map( (s) => {
    if ( s.tags ) {
      return (s.tags.language || '').toUpperCase()
    }
  }).filter(Boolean))  ) ].join(' ');

  const name = [
    getResolution(video),
    video.codec_name.toUpperCase(),
    langs,
    lang_subs ? `Sub ${lang_subs}` : ''
  ].filter(Boolean).join(' ');

  // const extname = Path.extname(FILE);
  // const filename = Path.basename(FILE, extname);

  return `${name}${releaserName ? ' ' + releaserName : ''}`;


}



async function renameFile(from, to) {
  Log.info('rename file', Path.basename(from), 'to', Path.basename(to));
  await FSRename(from, to);
}


async function downloadFile(from, to) {
  // File destination.txt will be created or overwritten by default.
  return await FSCopy(from, to, FS.constants.COPYFILE_EXCL);
}


async function extractTitleYearS(folder) {
  Log.debug('extracting title-year-season from', folder);
  let parts = getDirName(folder).toLowerCase().split( Path.sep );
  let seas = parts.pop();
  let title_year = parts.pop();

  if ( ! seas.startsWith('season ') ) { // NB the 'space' at the end of string
    Log.debug('folder is not a season');
    title_year = seas;
    seas = '';
  }

  let basename = title_year;
  let year = basename.match(/\((\d{4})\)$/) ? basename.match(/\((\d{4})\)$/)[1] : 0;
  let title = basename.replace(/\((\d{4})\)$/, '');

  seas = seas.match(/\((\d{2})\)$/) ? seas.match(/\((\d{2})\)$/)[1] : 0;

  Log.info('extracted:', `'${title.trim()}' (${year}) [${seas}]`);

  return {
    title: title.trim(),
    year: Number(year),
    seas: Number(seas)
  }

}


async function execRar(sourceFile, filename, password, size) {
  const folder = Path.dirname(sourceFile);


  const filesToDelete = await listRarFiles(folder, '*.rar');
  if ( filesToDelete.length ) {
    Log.info('deleting previous generated rar files:', filesToDelete);
  }
  for ( let file of filesToDelete ) {
    FS.unlinkSync( Path.join(folder, file ));
  }


  let hasPassword = !!password;
  size = size || 250000;
  const switches =  ["a", `-v${size}k`, `${filename}.rar`, `${sourceFile}`]

  if ( hasPassword ) {
    switches.splice(1, 0, '-p');
  }

  const checkPassword = (data) => {
    if ( hasPassword ) {
      // 'Enter password' and 'Reenter password';
      let askPwd = data.toLowerCase().indexOf('enter password') > -1;
      if ( askPwd ) {
        proc.stdin.write(`${password}\n`);
      }
    }
  }

  Log.info('start splitting file into RAR files');

  const proc = ChildProcess.spawn("rar", switches);

  let timer = setInterval(() => {
    Log.info('splitting in RAR...');
  }, 5000);

  proc.stdout.on("data", data => {
    // Log.debug(`RAR: ${data}`);
  });

  proc.stderr.on("data", data => {
    Log.error(`RAR: ${data}`);
    checkPassword(data.toString());
  });

  proc.on('error', (error) => {
    Log.error(`RAR: ${error.message}`);
  });

  return new Promise( (resolve, reject) => {
    proc.on("close", code => {
      clearInterval(timer);
      Log.info(`RAR process exited with code ${code}`);
      if ( code > 0 ) {
        reject();
      } else {
        const files = listRarFiles(folder, '*.part*.rar');
        return resolve(files);
      }
    });
  });

}


async function execRev(sourceFile) {
  // rar rv /path/TITOLO.rar
  const folder = Path.dirname(sourceFile);


  const filesToDelete = await listRarFiles(folder, '*.rev');
  if ( filesToDelete.length ) {
    Log.info('deleting previous generated rev files:', filesToDelete);
  }
  for ( let file of filesToDelete ) {
    FS.unlinkSync( Path.join(folder, file ));
  }


  const switches =  ["rv", sourceFile]

  Log.info('start creating REV files');

  const proc = ChildProcess.spawn("rar", switches);

  let timer = setInterval(() => {
    Log.info('creating REV...');
  }, 5000);

  proc.stdout.on("data", data => {
    // Log.debug(`REV: ${data}`);
  });

  proc.stderr.on("data", data => {
    Log.error(`REV: ${data}`);
  });

  proc.on('error', (error) => {
    Log.error(`REV: ${error.message}`);
  });

  return new Promise( (resolve, reject) => {
    proc.on("close", code => {
      clearInterval(timer);
      Log.info(`REV process exited with code ${code}`);
      if ( code > 0 ) {
        reject();
      } else {
        const files = listRarFiles(folder, '*.part*.rev');
        return resolve(files);
      }
    });
  });

}


async function listRarFiles(folder, pattern) {
  const files = Glob.sync(pattern, {
    nodir: true,
    cwd: folder
  });
  return files;
}


module.exports = {downloadFile, extractTitleYearS, execRar, execRev, generateNewFilenameMetadata, renameFile};
