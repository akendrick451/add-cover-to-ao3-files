const { findContentOpfPath, getFicInfo } = require('../static/app.js')
const JSZip = require('../static/jszip.min.js');

const fs = require("fs");

// We use a DOMParser in the `getFicInfo` method; there's one in the
// browser but not in Node, so make one available.
// https://stackoverflow.com/a/54096238/1558022
const jsdom = require("jsdom")
const { JSDOM } = jsdom
global.DOMParser = new JSDOM().window.DOMParser




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



QUnit.module('getFicInfo');

QUnit.test('it finds the key info from a `content.opf file`', (assert) => {
    // I got this `content.opf` file from downloading the ePub
    // of one of my fics: https://archiveofourown.org/works/52250080
    //
    // Retrieved https://archiveofourown.org/works/52250080
    const xml = `
        <?xml version='1.0' encoding='utf-8'?>
        <package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uuid_id">
          <metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <dc:title>Operation Cameo</dc:title>
            <dc:language>en</dc:language>
            <dc:creator opf:file-as="alexwlchan" opf:role="aut">alexwlchan</dc:creator>
            <dc:subject>Fanworks</dc:subject>
            <dc:subject>General Audiences</dc:subject>
            <dc:subject>Operation Mincemeat: A New Musical - SpitLip</dc:subject>
            <dc:subject>No Archive Warnings Apply</dc:subject>
          </metadata>
          <manifest>
            <item id="html4" href="Operation_Cameo_split_000.xhtml" media-type="application/xhtml+xml"/>
            …
          </manifest>
          <spine toc="ncx">
            <itemref idref="html4"/>
            …
          </spine>
        </package>
    `.trim();
    
    assert.deepEqual(
      getFicInfo(xml),
      {
        title: 'Operation Cameo',
        author: 'alexwlchan',
        fandom: 'Operation Mincemeat: A New Musical - SpitLip',
      }
    );
});