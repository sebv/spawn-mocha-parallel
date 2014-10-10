# spawn-mocha-parallel

beta - work in progress

This let you run your test in parallel by spawning several child processes.
It was designed to be used with [gulp][gulp], but since it relies only
on npm, it may be used within various configuration.

[![NPM version](http://img.shields.io/npm/v/spawn-mocha-parallel.svg)](https://npmjs.org/package/spawn-mocha-parallel) 
[![Downloads](http://img.shields.io/npm/dm/spawn-mocha-parallel.svg)](https://npmjs.org/package/spawn-mocha-parallel)
[![Dependency Status](https://david-dm.org/sebv/spawn-mocha-parallel.svg)](https://david-dm.org/sebv/spawn-mocha-parallel)
[![devDependency Status](https://david-dm.org/sebv/spawn-mocha-parallel/dev-status.svg)](https://david-dm.org/sebv/spawn-mocha-parallel#info=devDependencies)

## Credits

This was originaly a fork of [gulp-spawn-mocha] but has deviated a lot since
then.

## Usage

Using built in mochaStream:

```js
var mochaStream = require('./lib').mochaStream;

var mocha = mochaStream({concurrency: 10});

gulp.task('test-mocha', function() {
  gulp.src('**/*-specs.js', {read: false}) 
    .pipe(mocha)
    .on('error', console.error)
});

```

Using SpawnMocha

```js
var SpawnMocha = require('./lib').SpawnMocha,
    _ = require('lodash');
    through = require('through');

// customize output as you need
function mochaStream(opts) {
  opts = opts || {};
  var spawnMocha = new SpawnMocha(opts);
  var stream = through(function write(file) {
    spawnMocha.add(file.path);
  }, function() {});
  var errors = [];
  spawnMocha.on('error', function(err) {
    console.error(err.toString());
    errors.push(err);
  }).on('end', function() {
    if(errors.length > 0) {
      console.error('ERROR SUMMARY: ');
      _(errors).each(function(err) {
        console.error(err);
        console.error(err.stack);        
      });
      stream.emit('error', "Some tests failed.");
    }
    stream.emit('end');
  });
  return stream;
}

var mocha = mochaStream({concurrency: 3});

gulp.task('test-custom-mocha', function() {
  gulp.src('**/*-specs.js', {read: false}) 
    .pipe(mocha)
    .on('error', console.error)
});

```

## Options

- concurrency: # of mocha instance running in parallel (default: 1)
- env mocha running env, (default: process.env)
- flags: mocha flags (default: none)

## Todo

- option to prevent buffering of output (for dev)
- concatenate mocha status at the end

## License

MIT

  [gulp]: http://gulpjs.com/ "gulp.js"
  [mocha]: http://visionmedia.github.io/mocha/ "Mocha"
