"use strict";
/* global describe, it */

describe('@suiteA@groupA@', function() {
  this.timeout(3000);
  it('should work, NODE_ENV: ' + process.env.NODE_ENV, function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});
describe('@suiteA@groupB@', function() {
  this.timeout(3000);
  it('should work, NODE_ENV: ' + process.env.NODE_ENV, function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});
describe('@suiteA@groupC@', function() {
  this.timeout(3000);
  it('should work, NODE_ENV: ' + process.env.NODE_ENV, function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});