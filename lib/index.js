"use strict";

// Module Requirements
var _ = require('lodash'),
  proc = require('child_process'),
  join = require('path').join,
  async = require('async'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  streamBuffers = require("stream-buffers"),
  through = require('through'),
  split = require('split'),
  fs = require('fs');

require('colors');

function newStreamBuffer() {
  var stream = new streamBuffers.WritableStreamBuffer({
    initialSize: (25 * 1024),
    incrementAmount: (10 * 1024)
  });
  return stream;
}

var SpawnMocha = function (opts) {
  var _this = this;
  opts = opts || {};
  _.defaults(opts, {
    errorSummary: true
  });
  var queue = async.queue(function (task, done) {
    // Setup
    var iterationOpts = _.merge(_.clone(opts), task.iterationOpts);
    var bin = _.isFunction(opts.bin) ? opts.bin() : opts.bin ||
    join(__dirname, '..', 'node_modules', '.bin', 'mocha');
    var env = _.isFunction(iterationOpts.env) ? iterationOpts.env() : iterationOpts.env || process.env;
    env = _.clone(env);

    // Generate arguments
    var args = [];
    _(iterationOpts.flags).each(function (val, key) {
      if (_.isFunction(val)) val = val();
      args.push((key.length > 1 ? '--' : '-') + key);
      if (_.isString(val) || _.isNumber(val)) {
        args.push(val);
      }
    }).value();

    var stdout = newStreamBuffer();
    var stderr = newStreamBuffer();
    var fsStream = iterationOpts.fileOutput ?
      fs.createWriteStream(iterationOpts.fileOutput, {flags: 'a', encoding: 'utf8'}) : null;

    // Split xunit test report in several files if required
    if (env.JUNIT_REPORT_PATH) {
      env.JUNIT_REPORT_PATH = env.JUNIT_REPORT_PATH.replace(/xml$/, task.taskNum + '.xml');
    }
    // Execute Mocha
    var child = proc.spawn(bin, args.concat(task.files), {env: env});

    if (opts.liveOutput) {
      child.stdout.pipe(split())
        .on('data', function (line) {
          console.log((iterationOpts.liveOutputPrepend || '') + line);
        });
      child.stderr.pipe(split())
        .on('data', function (line) {
          console.error((iterationOpts.liveOutputPrepend || '') + line);
        });
      if (fsStream) {
        child.stdout.pipe(fsStream);
        child.stderr.pipe(fsStream);
      }
    } else {
      child.stdout.pipe(stdout);
      child.stderr.pipe(stderr);
    }

    // When done...
    child.on('close', function (errCode) {
      if (stdout.size()) {
        var contentOut = stdout.getContentsAsString("utf8");
        console.log(contentOut);
        if (fsStream) {
          fsStream.write(contentOut + '\n', 'utf8');
        }
      }
      if (stderr.size()) {
        var contentErr = stdout.getContentsAsString("utf8");
        console.error(contentErr);
        if (fsStream) {
          fsStream.write(contentErr + '\n', 'utf8');
        }
      }
      if (fsStream) {
        fsStream.close();
      }

      var err = null;
      if (errCode && opts.errorSummary) {
        err = new Error('Error for files: ' + task.files.join(', '));
        err.files = task.files;
        err.stderr = stderr.size() ? stderr.getContentsAsString("utf8") : '';
        err.code = errCode;
      }
      done(err);
    });
  }, opts.concurrency || 1);

  queue.drain = function () {
    _this.emit('end');
  };

  var taskNum = 0;
  this.add = function (files, iterationOpts) {
    taskNum++;
    if (!_.isArray(files)) {
      files = [files];
    }
    var task = {taskNum: taskNum, files: files, iterationOpts: iterationOpts || {}};
    queue.push(task, function (err) {
      if (err) {
        _this.emit('error', err, files);
      }
    });
  };
};

util.inherits(SpawnMocha, EventEmitter);

var mochaStream = function mocha(opts) {
  opts = opts || {};
  var spawnMocha = new SpawnMocha(opts);
  var stream = through(function write(file) {
    spawnMocha.add(file.path);
  }, function () {});
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
      stream.emit('error', "Some tests failed.");
    }
    stream.emit('end');
  });
  return stream;
};

var mochaIteration = function mochaIteration(opts, files, cb) {
  opts = opts || {};
  var spawnMocha = new SpawnMocha(opts);
  opts.iterations.forEach(function (iteration) {
    spawnMocha.add(files, iteration);
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
};
module.exports = {
  SpawnMocha: SpawnMocha,
  mochaStream: mochaStream,
  mochaIteration: mochaIteration
};
