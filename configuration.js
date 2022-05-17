require('dotenv').config();
const Path = require('path');



const Config = {
  TmdbKey: process.env.TMDB_KEY,
  MdbListKey: process.env.MDBLIST_KEY,
  TempDir: Path.resolve( process.env.TEMP_DIR || './temp'),
  NumberOfScreenshots: process.env.NUM_OF_SCREEN || 3,
  Ftp: {
    Host: process.env.FTP_SERVER,
    Port: process.env.FTP_PORT,
    User: process.env.FTP_USER,
    Pass: process.env.FTP_PWD
  }
};



module.exports = {Config};
