const Yargs = require('yargs/yargs');
const Logger = require('./logger');

const Log = new Logger('app');

const Argv = Yargs(process.argv.slice(2))
  .usage('Usage: $0 <command> <options>')
  .command('movie <file>', 'process the specified movie file', function(yargs) {
    Log.info('Requested command: movie');
    const command = require('./commands/movie_command');
    startCommand( command );
  })
  .example('$0 movie [file]', 'process the specified movie file')


  .demandCommand()

  .option('fork', {
    type: 'boolean',
    default: true,
    describe: 'start threads'
  })

  .option('download', {
    type: 'boolean',
    default: true,
    describe: 'download file to temp folder'
  })

  .option('scraper', {
    type: 'boolean',
    default: true,
    describe: 'search for title-year on TMDB/TVDB'
  })

  .option('metadata', {
    type: 'boolean',
    default: true,
    describe: 'extract metadata from video file'
  })

  .option('screens', {
    type: 'boolean',
    default: true,
    describe: 'extract screenshots from video file'
  })

  .option('n_screens', {
    type: 'number',
    default: 4,
    describe: 'number of screenshots'
  })

  .option('rar', {
    type: 'boolean',
    default: true,
    describe: 'split videofile in .part*.rar'
  })

  .option('k_rar', {
    type: 'number',
    default: true,
    describe: 'dimension of rar files in kilobytes'
  })

  .option('rev', {
    type: 'boolean',
    default: true,
    describe: 'create .rev file for .part*.rar'
  })

  .option('password', {
    type: 'string',
    default: '',
    describe: 'crypt rar with password'
  })

  .option('ftp', {
    type: 'boolean',
    default: true,
    describe: 'upload .partX.rar and .rev files on FTP server'
  })

  .help('h')
  .alias('h', 'help')
  .epilog('-- RedPrimrose crew --')
  .argv



async function startCommand(cmd) {
    setTimeout(async () => {
      cmd.start(Argv)
    }, 500);
}
