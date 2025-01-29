QUnit.module('getKeyFicInfo', () => {
  function assertGetsTheRightKeyInfo(assert, path, expectedInfo) {
    const done = assert.async();
    
    JSZipUtils.getBinaryContent(path, function(err, data) {
      if (err) {
        throw err;
      }

      JSZip.loadAsync(data).then(async function (zip) {
        const ficInfo = await getKeyFicInfo(zip);
        assert.deepEqual(ficInfo, expectedInfo);
        done();
      });
    });
  }
  
  // This EPUB file was downloaded from one of my fics,
  // retrieved 26 January 2025
  QUnit.test('it finds the key info from one of my fics', (assert) => {
    assertGetsTheRightKeyInfo(
      assert,
      'test/fixtures/Operation_Cameo.epub',
      {
        title: 'Operation Cameo',
        author: 'alexwlchan',
        fandom: 'Operation Mincemeat: A New Musical - SpitLip',
      }
    );
  });
  
  // This EPUB file was downloaded from David MacIver's fic "Stargate Physics",
  // retrieved 26 January 2025
  QUnit.test('it finds the fandom if there are multiple fandoms', (assert) => {
    assertGetsTheRightKeyInfo(
      assert,
      'test/fixtures/Stargate_Physics_101.epub',
      {
        title: 'Stargate Physics 101',
        author: 'DRMacIver',
        fandom: 'Stargate - All Series, Stargate SG-1'
      }
    );
  });
});





QUnit.module('chooseColour', () => {
  QUnit.test('it chooses the colour in a reproducible way', (assert) => {
    const fandom = 'Operation Mincemeat: A New Musical - SpitLip';
    assert.equal(chooseColour(fandom), '#098262');
  });
  
  QUnit.test('it chooses different colours for Star Wars and Star Trek', (assert) => {
    assert.equal(chooseColour('Star Wars'), '#740ca3');
    assert.equal(chooseColour('Star Trek'), '#08724b');
  });
  
  QUnit.test('it creates the same colour for all Star Trek shows', (assert) => {
    assert.equal(chooseColour('Star Trek'), '#08724b');
    assert.equal(chooseColour('Star Trek TOS'), '#08724b');
    assert.equal(chooseColour('Star Trek: Lower Decks'), '#08724b');
  })
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
