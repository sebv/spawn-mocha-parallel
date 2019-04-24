"use strict";

var gulp = require('gulp'),
  mochaStream = require('./lib').mochaStream,
  SpawnMocha = require('./lib').SpawnMocha,
  _ = require('lodash'),
  through = require('through'),
  Q = require('q'),
  runSequence = Q.denodeify(require('run-sequence')),
  assert = require('assert'),
  File = require('vinyl'),
  from = require('from'),
  path = require('path'),
  glob = require('glob');

function customMocha(opts) {
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
      }).value();
      stream.emit('error', "Some tests failed.");
    }
    stream.emit('end');
  });
  return stream;
}

gulp.task('test-mocha', function() {
  var startMS = Date.now();
  var StdOutFixture = require('fixture-stdout');
  var fixture = new StdOutFixture();
  var output = '';
  fixture.capture( function onWrite (string ) {
    output += string;
    return false;
  });
  var mocha = mochaStream({concurrency: 10});
  var srcFiles = [];
  _(10).times(function() {
    srcFiles.push(new File({
      cwd: "/",
      base: "test/",
      path: "test/a-test-specs.js",
    }));
  }).value();
  return from(srcFiles)
    .pipe(mocha)
    .on('error', console.error)
    .on('end', function() {
      fixture.release();
      // we should have run 10 tests in parallel in less than 10 sec
      assert(output.match(/1 passing/g).length === 10);
      assert( Date.now() - startMS < 5000);
    });
});

gulp.task('test-custom-mocha', function() {
  return gulp.src('test/*-specs.js', {read: false})
    .pipe(customMocha())
    .on('error', console.error);
});

gulp.task('test-live-output', function() {
  var mocha = mochaStream({liveOutput: true, concurrency: 1});
  var srcFiles = [];
  srcFiles.push(new File({
    cwd: "/",
    base: "test/",
    path: "test/a-test-specs.js",
  }));
  return from(srcFiles)
    .pipe(mocha);
});

gulp.task('test-live-output-with-file', function() {
  var mocha = mochaStream({
    liveOutput: true,
    fileOutput: '/tmp/out.log',
    concurrency: 1
  });
  var srcFiles = [];
  srcFiles.push(new File({
    cwd: "/",
    base: "test/",
    path: "test/a-test-specs.js",
  }));
  return from(srcFiles).pipe(mocha);
});

gulp.task('test-with-file', function() {
  var mocha = mochaStream({
    fileOutput: '/tmp/out.log',
    concurrency: 1
  });
  var srcFiles = [];
  srcFiles.push(new File({
    cwd: "/",
    base: "test/",
    path: "test/a-test-specs.js",
  }));
  return from(srcFiles).pipe(mocha);
});


gulp.task('test-live-output-with-prepend', function() {
  var mocha = mochaStream({
    liveOutput: true,
    liveOutputPrepend: 'client --> ',
    concurrency: 1,
    flags: { R: "tap" }
  });
  var srcFiles = [];
  srcFiles.push(new File({
    cwd: "/",
    base: "test/",
    path: "test/a-test-specs.js",
  }));
  return from(srcFiles)
    .pipe(mocha);
});

gulp.task('test-mocha-opts-override', function (cb) {
  function mochaIteration(opts, overrides, files, cb) {
    opts = opts || {};
    var spawnMocha = new SpawnMocha(opts);
    overrides.forEach(function (override) {
      spawnMocha.add(files, override);
    });
    var errors = [];
    spawnMocha.on('error', function (err) {
      console.error(err.toString());
      errors.push(err);
    }).on('end', function () {
      if (errors.length > 0) {
        console.error('ERROR SUMMARY: ');
        _(errors).each(function (err) {
          console.error(err);
          console.error(err.stack);
        }).value();
        return cb(new Error('some tests failed'));
      }
      cb(null);
    });
  }

  function setEnv(envs) {
    var env = process.env;
    env = _.clone(env);
    env = _.merge(env, envs, {JUNIT_REPORT_PATH: path.resolve(__dirname, 'test/report/report.xml')});
    return env;
  }

  var opts = {
    concurrency: 3,
    flags: {R: 'mocha-jenkins-reporter'}
  };
  var overrides = [{
    env: setEnv({NODE_ENV: 'groupa'}),
    flags: {grep: "@groupA@"}
  }, {
    env: setEnv({NODE_ENV: 'groupb'}),
    flags: {grep: "@groupB@"}
  }, {
    env: setEnv({NODE_ENV: 'groupc'}),
    flags: {grep: "@groupC@"}
  }];

  glob('test/group/*-specs.js', function (err, files) {
    if (err) {
      return cb(err);
    }
    console.log('files', files);
    mochaIteration(opts, overrides, files, cb);
  });
});

gulp.task('test', function() {
  return runSequence(
    'test-mocha',
    'test-custom-mocha',
    'test-live-output',
    'test-live-output-with-prepend',
    'test-live-output-with-file',
    'test-with-file',
    'test-mocha-opts-override'
  );
});
