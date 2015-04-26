"use strict";
/* global describe, it */

describe('@suiteB@groupA@', function() {
  this.timeout(3000);
  it('should work', function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});
describe('@suiteB@groupB@', function() {
  this.timeout(3000);
  it('should work', function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});
describe('@suiteB@groupC@', function() {
  this.timeout(3000);
  it('should work', function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});