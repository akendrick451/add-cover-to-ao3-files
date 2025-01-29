QUnit.module('getKeyFicInfo', () => {
  QUnit.test('it finds the key info from one of my fics', (assert) => {
    const done = assert.async();
    
    JSZipUtils.getBinaryContent('test/fixtures/Operation_Cameo.epub', function(err, data) {
      if (err) {
        throw err;
      }

      JSZip.loadAsync(data).then(async function (zip) {
        const ficInfo = await getKeyFicInfo(zip);
        assert.deepEqual(
          ficInfo,
          {
            title: 'Operation Cameo',
            author: 'alexwlchan',
            fandom: 'Operation Mincemeat: A New Musical - SpitLip',
          }
        );
        done();
      });
    });
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
