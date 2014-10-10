"use strict";

// Module Requirements
var _ = require('lodash'),
    proc = require('child_process'),
    join = require('path').join,
    async = require('async'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    streamBuffers = require("stream-buffers"),
    through = require('through');

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
  var greenDot = _.throttle(function() { process.stdout.write('.'.green); }, 
    250);
  var yellowDot = _.throttle(function() { process.stdout.write('.'.yellow); }, 
    250);

  var queue = async.queue(function (task, done) {
    // Setup
    var bin = _.isFunction(opts.bin) ? opts.bin() : opts.bin ||
      join(__dirname, '..', 'node_modules', '.bin', 'mocha'); 
    var env = _.isFunction(opts.env) ? opts.env() : opts.env || process.env;

    // Generate arguments
    var args = [];
    _(opts.flags).each(function (val, key) {    
      if(_.isFunction(val)) val = val();
      args.push((key.length > 1 ? '--' : '-') + key);
      if (_.isString(val) || _.isNumber(val)) {
        args.push(val);
      }
    });

    var stdout = newStreamBuffer();
    var stderr = newStreamBuffer();

    // Execute Mocha
    var child = proc.spawn(bin, args.concat(task.files), {env: env});

    child.stdout.pipe(stdout);
    child.stderr.pipe(stderr);
    child.stdout.on('data', function() { greenDot(); });
    child.stderr.on('data', function() { yellowDot(); });

    // TODO if option output directly to console 
    // child.stdout.pipe(process.stdout);
    // child.stderr.pipe(process.stderr);
    // When done...
    child.on('close', function(errCode) {
      if(stdout.size()) { console.log(stdout.getContentsAsString("utf8")); }   
      if(stderr.size()) { console.error(stderr.getContentsAsString("utf8")); }
      var err = null;
      if(errCode) {
        err = new Error('Error for files: ' + task.files.join(', '));
        err.files = task.files;
        err.stderr = stderr.size() ? stderr.getContentsAsString("utf8") : '';
        err.code = errCode;
      }
      done(err);
    });
  }, opts.concurrency || 1);

  queue.drain = function() {
    _this.emit('end');
  };

  this.add = function(files) {
    if (!_.isArray(files)) {
      files = [files];
    }
    var task = {files: files};
    queue.push(task, function(err) {
      if(err){
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
};

module.exports = {
  SpawnMocha: SpawnMocha,
  mochaStream: mochaStream  
};
