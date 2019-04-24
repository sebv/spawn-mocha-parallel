"use strict";
/* global describe, it */

describe('@suiteC@groupA@', function() {
  this.timeout(3000);
  it('should work', function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});
describe('@suiteC@groupB@', function() {
  this.timeout(3000);
  it('should work', function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});
describe('@suiteC@groupC@', function() {
  this.timeout(3000);
  it('should work', function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});