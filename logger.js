const DayJs = require('dayjs');


function now() {
  return DayJs().format('YYYY-MM-DD HH:mm:ss.SSS')
}

class Logger extends console.Console {
  constructor(name) {
    super(process.stdout); //...(Array.prototype.slice.call(arguments, 1)) );
    this._name = name;
  }

  error() {
    super.error(...[now(), 'ERROR', `[${this._name}]`, ...arguments]);
  }
  warn() {
    super.warn(...[now(), 'WARN', `[${this._name}]`, ...arguments]);
  }
  info() {
    super.info(...[now(), 'INFO', `[${this._name}]`, ...arguments]);
  }
  debug() {
    super.debug(...[now(), 'DEBUG', `[${this._name}]`, ...arguments]);
  }
  log() {
    super.log(...[now(), 'LOG', `[${this._name}]`, ...arguments]);
  }

}

module.exports = Logger;
