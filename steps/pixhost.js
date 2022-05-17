const Pixhost = require('pixhost').init()
const Logger = require('../logger');

const Log = new Logger('pixhost');


async function createGallery(name, images) {

  const gallery = await Pixhost.createGallery(name);

  const res = {};

  for await (let image of images ) {
    const imgResp = await Pixhost.uploadImage(image.path, 0, 320, gallery.gallery_hash, gallery.gallery_upload_hash)
    Log.debug(image.name, imgResp);
    res[ image.name ] = imgResp.th_url;
  }

  const finish = await Pixhost.finalizeGallery(gallery.gallery_hash, gallery.gallery_upload_hash);
  Log.info('gallery uploaded');

  return {...gallery, urls: res};
}



module.exports = {createGallery};
