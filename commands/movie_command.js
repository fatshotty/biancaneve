const Logger = require('../logger');
const FileSystem = require('../steps/filesystem');
const FS = require('fs');
const Path = require('path');
const {Config} = require('../configuration');
const {mkdir, stringToLIT} = require('../utils');

const Scraper = require('../processes/scraper');
const FFMpeg = require('../processes/ffmpeg');
const Rar = require('../processes/rar');
const Ftp = require('../processes/ftp');
const Pug = require('../processes/pug');
const PixHost = require('../steps/pixhost');

const Log = new Logger('moviecommand');



// /Users/fatshotty/Sites/redprimrose_eb/temp/inception (2010)/inception (2010).mkv

async function start(argv) {
  Log.info('starting for', argv.file);

  const FILE = argv.file;

  if ( !FS.existsSync(FILE) ) {
    Log.error('original file does not exist', FILE);
    throw `file '${FILE} not exists`;
  }

  Log.debug('extract title/year');
  let metadata = await FileSystem.extractTitleYearS(FILE);

  Log.info('extracted info', JSON.stringify(metadata) );

  const foldername = `${metadata.title} (${metadata.year})`;

  Log.debug('creating new TEMP folder', foldername);
  const tempMovieFolder = mkdir( Config.TempDir, foldername, !argv.download );

  const filename = `${foldername}${Path.extname(FILE)}`;
  const tempMovieFullPath = Path.join(tempMovieFolder, filename);

  const filenameInLit = stringToLIT(`${metadata.title} ${metadata.year}`);
  Log.debug('filename transformed is', filenameInLit);

  if ( argv.download ) {
    Log.info('downloading file', FILE, 'in', tempMovieFullPath);
    await FileSystem.downloadFile(FILE, tempMovieFullPath);
  }


  const steps = [Promise.resolve()];

  if ( argv.scraper ) {
    const p_scraper = Scraper.exec(argv.fork,{
      CONFIG: Config,
      args: argv,
      data: {
        title: metadata.title,
        year: metadata.year,

        folder: tempMovieFolder,
        file: tempMovieFullPath,
        fileLit: filenameInLit
      }
    });
    steps.push(p_scraper);
  } else {
    steps.push(Promise.resolve());
  }

  if ( argv.metadata || argv.screens ) {
    const p_ffmpeg = FFMpeg.exec(argv.fork,{
      CONFIG: Config,
      args: argv,
      data: {
        title: metadata.title,
        year: metadata.year,

        folder: tempMovieFolder,
        file: tempMovieFullPath,
        fileLit: filenameInLit
      }
    });
    steps.push(p_ffmpeg)
  } else {
    steps.push(Promise.resolve());
  }


  if ( argv.rar ) {
    let p_rar = Rar.exec(argv.fork,{
      CONFIG: Config,
      args: argv,
      data: {
        title: metadata.title,
        year: metadata.year,

        folder: tempMovieFolder,
        file: tempMovieFullPath,
        fileLit: filenameInLit
      }
    });

    if ( argv.ftp ) {
      p_rar = p_rar.then( (files) => {
        Log.info('rar job completed. Start FTP');
        return Ftp.exec(false,{
          CONFIG: Config,
          args: argv,
          data: {
            title: metadata.title,
            year: metadata.year,
            rar: files.rar,
            rev: files.rev,
            folder: tempMovieFolder,
            file: tempMovieFullPath,
            fileLit: filenameInLit
          }
        }).then( () => {
          Log.debug('ftp completed!')
          return files;
        });
      })
    }
  //   steps.push(p_rar);
  // } else {
  //   steps.push(Promise.resolve());
  }


  return await Promise.all(steps).then( async (resp) => {

    Log.info('all jobs are completed. Proceed with final steps');

    const pugdata = {
      scraper: resp[1],
      ffmpeg: resp[2],
      // rar: resp[3],
      images: {urls: {}}
    };

    // FS.writeFileSync( Path.join(tempMovieFolder, `${filenameInLit}-tmdb.txt`), JSON.stringify(resp[0] || {}), {encoding: 'utf-8'});
    // FS.writeFileSync( Path.join(tempMovieFolder, `${filenameInLit}-video.txt`), JSON.stringify((resp[1] || {}).video || {}), {encoding: 'utf-8'});

    // console.log( JSON.stringify(pugdata, null, 2) );
    const images = [];
    if ( pugdata.ffmpeg && pugdata.ffmpeg.screens ) {
      images.splice(0,0, ...pugdata.ffmpeg.screens.map( (s, i) => ({'name': `screenshot_${(i + 1)}`, path: Path.join(tempMovieFolder, s)} ) ) );
    }

    if ( pugdata.scraper && pugdata.scraper.tmdb && pugdata.scraper.tmdb.posterPath ) {
      images.push( {name: 'poster', path: Path.join(tempMovieFolder, pugdata.scraper.tmdb.posterPath) } );
    }

    if ( pugdata.scraper && pugdata.scraper.tmdb && pugdata.scraper.tmdb.backdropPath ) {
      images.push( {name:'backdrop', path: Path.join(tempMovieFolder, pugdata.scraper.tmdb.backdropPath) });
    }

    if ( images.length ) {
      Log.info('uploading images', images.map((img) => Path.basename(img.path)) );
      const uploadedImages = await PixHost.createGallery(filenameInLit, images);
      Log.info('images uploded');
      Log.debug(uploadedImages);
      pugdata.images = uploadedImages;
    }

    let p_pug = Pug.exec(false,{
      CONFIG: Config,
      args: argv,
      data: {
        title: metadata.title,
        year: metadata.year,

        folder: tempMovieFolder,
        file: tempMovieFullPath,
        fileLit: filenameInLit,
        ...pugdata
      }
    });

    p_pug.finally( () => {
      // console.log('');
      // console.log( JSON.stringify({
      //   scraper: pugdata.scraper,
      //   images: pugdata.images
      // }, null, 2) );
      FS.writeFileSync( Path.join(tempMovieFolder, 'file-report.json'), JSON.stringify(pugdata, null, 2), {encoding: 'utf-8'} )
      Log.info('completed'); 
    })


  })

}



module.exports = {start};
