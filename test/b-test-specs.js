"use strict";
/* global describe, it */

describe('b test', function() {
  this.timeout(3000);
  it('should work', function(done) {
    setTimeout(function() {
      done();
    }, 2000);
  });
});
