const Pug = require('pug');
const FS = require('fs');

async function compileMovieArticle(destination, data) {

  const str = Pug.renderFile('../templates/movie.pug', data);

  FS.writeFileSync( destination, str, 'utf-8');

}
