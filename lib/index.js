"use strict";

// Module Requirements
var _ = require('lodash'),
    proc = require('child_process'),
    join = require('path').join,
    async = require('async'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    streamBuffers = require("stream-buffers");

function newStreamBuffer() {
  var stream = new streamBuffers.WritableStreamBuffer({
      initialSize: (25 * 1024),
      incrementAmount: (10 * 1024)
  });
  return stream;
}

module.exports = function (opts) {
  var _this = this;
  opts = opts || {};
  console.log(opts);

  var queue = async.queue(function (task, done) {
    // Setup
    var bin = _.isFunction(opts.bin) ? opts.bin() : opts.bin ||
      join(__dirname, '..', 'node_modules', '.bin', 'mocha'); 
    var env = _.isFunction(opts.env) ? opts.env() : opts.env || {};

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
    child.stdout.on('data', function() {process.stdout.write('.');});
    child.stdout.pipe(stdout);
    child.stderr.pipe(stderr);
    // child.stdout.pipe(process.stdout);
    // child.stderr.pipe(process.stderr);
    // When done...
    child.on('close', function(err) {
      console.log(stdout.getContentsAsString("utf8"));    
      console.error(stderr.getContentsAsString("utf8"));
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

util.inherits(module.exports, EventEmitter);
