"use strict";

var gulp = require('gulp'),
    mochaStream = require('.').mochaStream,
    SpawnMocha = require('.').SpawnMocha,
    _ = require('lodash'),
    through = require('through'),
    assert = require('assert'),
    File = require('vinyl'),
    from = require('from');


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
  fixture.capture(function onWrite (string ) {
    output += string;
    return false;
  });
  var mocha = mochaStream({concurrency: 10});
  var srcFiles = [];
  _.times(10, function () {
    srcFiles.push(new File({
      cwd: "/",
      base: "test/",
      path: "test/a-test-specs.js",
    }));
  });
  return from(srcFiles)
    .pipe(mocha)
    .on('error', console.error)
    .on('end', function() {
      fixture.release();
      // we should have run 10 tests in parallel in less than 10 sec
      assert(output.match(/1 passing/g).length === 10);
      assert(Date.now() - startMS < 8000);
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


gulp.task('test', gulp.series(
  'test-mocha',
  'test-custom-mocha',
  'test-live-output',
  'test-live-output-with-prepend',
  'test-live-output-with-file',
  'test-with-file'
));
