"use strict";
/* global describe, it */

describe('a test', function() {
  this.timeout(3000);
  it('should work', function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});
