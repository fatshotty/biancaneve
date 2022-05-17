const { isMainThread } = require('worker_threads');
const TMDB = require('tmdb').Tmdb;
const {cleanString, exec_thread} = require('../utils');
const FS = require('fs');
const Path = require('path');
const Got = require('got');
const Logger = require('../logger');
const {MDBList} = require('mdblist-lib');

const Log = new Logger('scraper');

async function start({CONFIG, args, data}) {

  const TmdbCli = new TMDB( CONFIG.TmdbKey, 'it' );
  const MDB = new MDBList( CONFIG.MdbListKey);

  Log.info('scraping', data.title, data.year);

  const searchResponse = await TmdbCli.get(`search/movie`, {query: data.title, language: TmdbCli.language});

  const searchItems = searchResponse.results;

  const movieCleanTitle = cleanString( data.title );

  Log.info('found', searchItems.length, 'results on TMDB:', movieCleanTitle);

  async function scrapeOnTmdb() {

    for await ( let searchItem of searchItems ) {

      let tmdbid = searchItem.id;
      Log.info(`scraping '${searchItem.title}' (${searchItem.year}) [${tmdbid}] on tmdb`);

      try {
        // const res = await TmdbCli.getMovie(tmdbid);
        const res = await TmdbCli.get(`movie/${tmdbid}`, {append_to_response: 'credits', include_image_language: 'it', language: TmdbCli.language})
        const movieYear = res.releaseDate.substring(0, 4);
        const checkYear = (data.year+1) >= movieYear && movieYear >= (data.year-1);

        const cleanOriginalTitle = cleanString( res.originalTitle.toLowerCase() );
        const cleanTitle = cleanString( res.title.toLowerCase() );

        const checkTitle = cleanTitle == movieCleanTitle || cleanOriginalTitle == movieCleanTitle;


        if ( checkTitle && checkYear ) {
          // data found

          let mdbMovieData = await MDB.byTmdbID(tmdbid);

          return {tmdb: res, mdb: mdbMovieData};
        } else {
          Log.warn(`no title/year match on tmdb '${cleanTitle}', '${cleanOriginalTitle}', (${movieYear})`);
        }

      } catch (e) {
        Log.debug(`error while searching on TMDB: ${movieCleanTitle} (${data.year}) - ${tmdbid} - ${cleanTitle}`, e);
      }
    }

    return null;
  }


  const scraped = await scrapeOnTmdb();

  if ( scraped ) {

    Log.info('Found data on tmdb', scraped.tmdb.id, scraped.tmdb.title, scraped.tmdb.releaseDate);

    // process metadata
    // download poster and backdrop

    const {tmdb, mdb} = scraped;

    Log.info('download images');

    const images = await Promise.all([
      download(mdb.poster, Path.join(data.folder, 'poster') ),
      download(mdb.backdrop, Path.join(data.folder, 'backdrop'))
    ])

    tmdb.posterPath = images[0] ? Path.relative(data.folder, images[0]) : '';
    tmdb.backdropPath = images[1] ? Path.relative(data.folder, images[1]) : '';

    Log.info('finish scraper');
    return scraped;

  } else {
    Log.error('cannot scrape movie', data.title, data.year);
  }

  throw new Error(`no data found for: ${data.title} (${data.year})`);

}


async function download(url, file) {
  return new Promise( (resolve, reject) => {

    Log.debug('downloading', url);
    const read = Got.stream( url );
    const ext = Path.extname(url);
    const destfilepath = `${file}${ext || '.jpg'}`;
    
    Log.debug('...stored in', destfilepath);
    const write = FS.createWriteStream(destfilepath);

    write.on('finish', () => {
      resolve(destfilepath)
    });
    write.on('error', (e) => {
      Log.error('cannot save image', url, e);
      resolve(null);
    });

    read.pipe(write);
  });
}



function exec(fork, data) {

  return exec_thread(fork, start, __filename, data);

}

if ( !isMainThread) {
  Log.debug('starting thread');
  exec();
}

module.exports = {exec};


