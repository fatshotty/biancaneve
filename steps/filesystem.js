const FS = require('fs');
const Path = require('path');
const ChildProcess = require("child_process");
const {promisify} = require('util');
const Glob = require('glob');

const Logger = require('../logger');

const Log = new Logger('FileSystem');


const FSCopy = promisify(FS.copyFile);


function getFileName(path) {
  return Path.basename(path);
}

function getDirName(path) {
  return Path.dirname(path);
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


async function execRar(sourceFile, filename, password) {
  // rar a -v250000k /path/TITOLO.rar /path/TITOLO.mkv
  const folder = Path.dirname(sourceFile);


  const filesToDelete = await listRarFiles(folder, '*.rar');
  if ( filesToDelete.length ) {
    Log.info('deleting previous generated rar files:', filesToDelete);
  }
  for ( let file of filesToDelete ) {
    FS.unlinkSync( Path.join(folder, file ));
  }


  let hasPassword = !!password;
  const switches =  ["a", "-v250000k", `${filename}.rar`, `${sourceFile}`]

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


module.exports = {downloadFile, extractTitleYearS, execRar, execRev};
