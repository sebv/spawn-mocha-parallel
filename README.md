# spawn-mocha-parallel

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
var mochaStream = require('spawn-mocha-parallel').mochaStream;

var mocha = mochaStream({concurrency: 10});

gulp.task('test-mocha', function() {
  return gulp.src('**/*-specs.js', {read: false}) 
    .pipe(mocha)
    .on('error', console.error)
});

```

Using SpawnMocha

```js
var SpawnMocha = require('spawn-mocha-parallel').SpawnMocha,
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
  return gulp.src('**/*-specs.js', {read: false}) 
    .pipe(mocha)
    .on('error', console.error)
});

```

## Options

- concurrency: # of mocha instance running in parallel (default: 1)
- env mocha running env, (default: process.env)
- flags: mocha flags (default: none)
- liveOutput: print output direct to console
- errorSummary: show error summary (default: true)
- iterations: Array, see below

### Iterations

If you want to run parallel processes based on criteria other than files, use an iterations array.

The iterations array should contain whatever "Options" (see above) you wish to override for a given iteration.

The easiest to envision example would be:
* your test suite names are annotated as: @groupA@, @groupB@, @groupC@, and so on
* these groupings are spread across files, where a file may contain one or more suite of a given group
* you want to spawn a mocha process for each grouping

To achieve, you would specify an iterations array where each entry uses a different mocha grep. E.g. the task
example "test-mocha-opts-parallel" in this project's `gulpfile.js`.

```javascript
gulp.task('test-mocha-opts-parallel', function () {
    function setEnv(envs) {
        var env = process.env;
        env = _.clone(env);
        env = _.merge(env, envs, {JUNIT_REPORT_PATH: path.resolve(__dirname, 'test/report/report.xml')});
        return env;
    }
    var opts = {
        concurrency: 3,
        flags: {R: 'mocha-jenkins-reporter'},
        iterations: [{
            env: setEnv({NODE_ENV: 'groupa'}),
            flags: {grep: "@groupA@"}
        }, {
            env: setEnv({NODE_ENV: 'groupb'}),
            flags: {grep: "@groupB@"}
        }, {
            env: setEnv({NODE_ENV: 'groupc'}),
            flags: {grep: "@groupC@"}
        }]
    };
    var mocha = mochaStream(opts);
    gulp.src('test/group/*-specs.js')
        .pipe(mocha);
});
```

Another use case might be if you are driving browser/device automation, and you want to run the same set of files
in parallel on several browser/device combinations.

## Todo

- concatenate mocha status at the end

## License

MIT

  [gulp]: http://gulpjs.com/ "gulp.js"
  [mocha]: http://visionmedia.github.io/mocha/ "Mocha"
