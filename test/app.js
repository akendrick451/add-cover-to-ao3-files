QUnit.module('findContentOpfPath');

QUnit.module('findContentOpfPath', () => {
  function assertFindsCorrectOpfPath(assert, { zipPath, expectedPath }) {
    const done = assert.async();
    
    JSZipUtils.getBinaryContent(zipPath, function(err, data) {
      if (err) {
        throw err;
      }

      JSZip.loadAsync(data).then(function (zip) {
        assert.equal(
          findContentOpfPath(zip), expectedPath
        );
        done();
      });
    });
  }
  
  QUnit.test('it finds a file at the top level', (assert) => {

    // This test file was made with the following commands:
    //
    //    $ touch content.opf
    //    $ zip example1.zip content.opf
    //
    assertFindsCorrectOpfPath(assert, {
      zipPath: 'test/fixtures/example1.zip',
      expectedPath: 'content.opf'
    });
  });

  QUnit.test('it finds a file in a nested folder', (assert) => {

    // This test file was made with the following commands:
    //
    //    $ mkdir subdir
    //    $ touch subdir/content.opf
    //    $ zip example2.zip subdir/content.opf
    //
    assertFindsCorrectOpfPath(assert, {
      zipPath: 'test/fixtures/example2.zip',
      expectedPath: 'subdir/content.opf'
    });
  });
  
  QUnit.test('it returns `null` if there’s no matching file', (assert) => {

    // This test file was made with the following commands:
    //
    //    $ touch greeting.txt
    //    $ zip example3.zip greeting.txt
    //
    assertFindsCorrectOpfPath(assert, {
      zipPath: 'test/fixtures/example3.zip',
      expectedPath: null
    });
  });
});



QUnit.module('getFicInfo', () => {
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
});





QUnit.module('chooseColour', () => {
  QUnit.test('it chooses the colour in a reproducible way', (assert) => {
    const fandom = 'Operation Mincemeat: A New Musical - SpitLip';
    assert.equal(chooseColour(fandom), '#800600');
  });
});





QUnit.module('getTitleLines', () => {
  QUnit.test('it splits a title on spaces', (assert) => {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("width", 600);
    canvas.setAttribute("height", 900);
    const ctx = canvas.getContext("2d");
    ctx.font = '95px Georgia';
  
    const lines = getTitleLines({
        ctx, title: 'Operation Cameo', maxWidth: 480,
    });
  
    assert.deepEqual(lines, ['Operation', 'Cameo']);
  });  
});
