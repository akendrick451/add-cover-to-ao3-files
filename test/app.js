const { findContentOpfPath } = require('../static/app.js')
const JSZip = require('../static/jszip.min.js');

const fs = require("fs");



QUnit.module('findContentOpfPath');

QUnit.test('it finds a file at the top level', (assert) => {
    const done = assert.async();

    // This test file was made with the following commands:
    //
    //    $ touch content.opf
    //    $ zip example1.zip content.opf
    //
    fs.readFile("test/fixtures/example1.zip", function(err, data) {
        if (err) throw err;
        JSZip.loadAsync(data).then(function(zip) {
            assert.equal(
                findContentOpfPath(zip), 'content.opf'
            );
            done();
        }).catch(function(err) {
            throw err;
        });
    });
});

QUnit.test('it finds a file in a nested folder', (assert) => {
    const done = assert.async();

    // This test file was made with the following commands:
    //
    //    $ mkdir subdir
    //    $ touch subdir/content.opf
    //    $ zip example2.zip subdir/content.opf
    //
    fs.readFile("test/fixtures/example2.zip", function(err, data) {
        if (err) throw err;
        JSZip.loadAsync(data).then(function(zip) {
            assert.equal(
                findContentOpfPath(zip), 'subdir/content.opf'
            );
            done();
        }).catch(function(err) {
            throw err;
        });
    });
});

QUnit.test('it returns `null` if there’s no matching file', (assert) => {
    const done = assert.async();
    
    // This test file was made with the following commands:
    //
    //    $ mkdir subdir
    //    $ touch subdir/content.opf
    //    $ zip example2.zip subdir/content.opf
    //
    fs.readFile("test/fixtures/example3.zip", function(err, data) {
        if (err) throw err;
        JSZip.loadAsync(data).then(function(zip) {
            assert.equal(
                findContentOpfPath(zip), null
            );
            done();
        }).catch(function(err) {
            throw err;
        });
    });
});
