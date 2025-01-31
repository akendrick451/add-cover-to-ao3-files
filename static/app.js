/**
 * FInd the path to `content.opf` inside a zip file.
 *
 * The `content.opf` file contains XML metadata about an ePub file.
 * It's normally stored at the root of the ePub, but find it in case
 * it's been stuffed inside a subdirectory.
 *
 * This returns the path, or `null` if there's no such file in
 * the ePub.
 */
async function findContentOpfPath(zip) {
  const parser = new DOMParser();

  // First look for the mandatory file META-INF/container.xml,
  // which contains a pointer to the `content.opf` file.
  //
  // The contents of this file will be XML of the form:
  //
  //    <?xml version="1.0"?>
  //    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  //       <rootfiles>
  //          <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  //
  //       </rootfiles>
  //    </container>
  //
  // In general AO3 stories put the `content.opf` at the top level,
  // but let's go ahead and find it properly.
  const containerXmlDoc = parser.parseFromString(
    await zip.file('META-INF/container.xml').async('string'),
    "text/xml"
  );

  const rootPath =
    containerXmlDoc
      .querySelector('rootfile')
      .getAttribute('full-path');

  console.debug(`Detected root path of EPUB file: ${rootPath}`);

  return rootPath;
}




/**
 * Get key information about this fic from the unpacked EPUB file.
 *
 */
async function getKeyFicInfo(zip) {
  // Get the path to `content.opf`.
  const rootPath = await findContentOpfPath(zip);

  // Now go ahead and get the contents of `content.opf`.
  //
  // This is the rough strucutre of the contents:
  //
  //    <?xml version='1.0' encoding='utf-8'?>
  //    <package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uuid_id">
  //      <metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:calibre="http://calibre.kovidgoyal.net/2009/metadata">
  //        <dc:title>A Stab Wars Story</dc:title>
  //        <dc:creator opf:file-as="apricot" opf:role="aut">Apricot (Paradisi)</dc:creator>
  //        …
  //      </metadata>
  //      <manifest>
  //        <item id="html4" href="A_Stab_Wars_Story_split_000.xhtml" media-type="application/xhtml+xml"/>
  //        …
  //      </manifest>
  //      <spine toc="ncx">
  //        …
  //      </spine>
  //    </package>
  //
  // We want to get the title, creator, and href of that first HTML page.
  const parser = new DOMParser();
  const containerOpfXmlDoc = parser.parseFromString(
    await zip.file(rootPath).async('string'),
    'text/xml'
  );

  // The title of the fic will be in a <dc:title> node, for example:
  //
  //     <dc:title>Operation Cameo</dc:title>
  //
  const namespaceResolver = (prefix) =>
    prefix === 'dc' ? 'http://purl.org/dc/elements/1.1/' : null;

  const title = containerOpfXmlDoc.evaluate(
    './/dc:title',
    containerOpfXmlDoc,
    namespaceResolver,
    XPathResult.STRING_TYPE
  ).stringValue;

  console.debug(`Detected title of EPUB file: ${title}`);

  // The author of the fic will be in a <dc:author> node, for example:
  //
  //     <dc:creator …>alexwlchan</dc:creator>
  //
  const author = containerOpfXmlDoc.evaluate(
    './/dc:creator',
    containerOpfXmlDoc,
    namespaceResolver,
    XPathResult.STRING_TYPE
  ).stringValue;

  console.debug(`Detected author of EPUB file: ${author}`);

  // The href of the first HTML file will be the first <item> node
  // with an HTML media type, for example:
  //
  //    <item
  //      id="html4"
  //      href="A_Stab_Wars_Story_split_000.xhtml"
  //      media-type="application/xhtml+xml"/>
  //
  const firstHtmlPath =
    containerOpfXmlDoc
      .querySelector('item[media-type="application/xhtml+xml"]')
      .getAttribute("href");

  console.debug(`Detected first HTML file in EPUB file: ${firstHtmlPath}`);

  // Now go ahead and read that file as HTML.  This contains the metadata
  // we actually want.
  const firstHtmlDoc = parser.parseFromString(
    await zip.file(firstHtmlPath).async('string'),
    'text/html'
  );

  // Look for the contents of a <dl> which contains some metadata
  // about this fic.
  //
  // We're interested in the <dd> after "Fandom:"
  //
  //    <dl class="tags">
  //          <dt class="calibre3">Rating:</dt>
  //          <dd class="calibre4"><a href="http://archiveofourown.org/tags/General%20Audiences">General Audiences</a></dd>
  //          <dt class="calibre3">Archive Warning:</dt>
  //          <dd class="calibre4"><a href="http://archiveofourown.org/tags/No%20Archive%20Warnings%20Apply">No Archive Warnings Apply</a></dd>
  //          <dt class="calibre3">Category:</dt>
  //          <dd class="calibre4"><a href="http://archiveofourown.org/tags/Gen">Gen</a></dd>
  //          <dt class="calibre3">Fandom:</dt>
  //          <dd class="calibre4"><a href="http://archiveofourown.org/tags/Rogue%20One:%20A%20Star%20Wars%20Story%20(2016)">Rogue One: A Star Wars Story (2016)</a></dd>
  //
  const fandom =
    Array.from(firstHtmlDoc.querySelectorAll('dt'))
      .find(dt => dt.innerText === 'Fandom:' || dt.innerText === 'Fandoms:')
      .nextSibling
      .nextSibling
      .innerText;

  console.debug(`Detected fandom in first HTML file: ${fandom}`);

  return { title, author, fandom };
}





/**
 * Choose a colour to represent the fics in this fandom.
 *
 * This is a random dark shade; the only important thing is that we
 * can call it reproducibly to get the same colour if this is called
 * the same time for the same fandom.
 *
 *
 */
function chooseColour(fandom) {

  // Choose the first two words of the fandom title.  This is enough
  // to distinguish e.g. "Star Wars" and "Star Trek", but also means
  // we'll get similar titles for fandoms with the same prefix.
  const fandomSlice = fandom.split(" ").slice(0, 2).join(" ").replace(/:$/, '');

  const seed = cyrb128(fandomSlice);
  const getRand = sfc32(seed[0], seed[1], seed[2], seed[3]);

  const hue = getRand();

  // The saturation/lightness values are chosen to get a dark-ish
  // shade that will look good with white text.
  const saturation = 0.7 + 0.3 * getRand();
  const lightness1 = 0.27 + 0.2 * getRand();
  const lightness2 = lightness1 - 0.15;

  // Convert to rgb.
  let [red1, green1, blue1] = hslToRgb(hue, saturation, lightness1);
  let [red2, green2, blue2] = hslToRgb(hue, saturation, lightness2);

  // Convert to a hex string.
  return [
    `#${numToHex(red1)}${numToHex(green1)}${numToHex(blue1)}`,
    `#${numToHex(red2)}${numToHex(green2)}${numToHex(blue2)}`,
  ];
}



/**
 * A seeded implementation of a random number generator in JavaScript.
 *
 * Written by Stack Overflow user bryc:
 * https://stackoverflow.com/a/47593316/1558022
 */
function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
    return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
}

function sfc32(a, b, c, d) {
  return function() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}




/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 *
 * This function is by Gary Tan and is taken from Stack Overflow:
 * https://stackoverflow.com/a/9493060/1558022
 */
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1/3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}



/**
 * Convert a number to a 2-digit hex string.
 */
function numToHex(n) {
  const hex = n.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}



/**
 * Create a PNG cover image for a book.
 *
 * Returns a <canvas> element for this cover.
 */
function createCoverImage(ficInfo) {
  // I want something with a rough 2:3 ratio that's big enough
  // for the text to look sharp, but we don't need anything huge.
  const width = 600;
  const height = 900;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("width", 600);
  canvas.setAttribute("height", 900);

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  const colors = chooseColour(ficInfo.fandom);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set text style.  We know white will look okay because we
  // chose a dark background.
  ctx.fillStyle = '#ffffffcc';
  ctx.textAlign = 'center';

  // Add the author name.
  ctx.font = '62px Georgia';

  const { lines: authorLines, separator } = getAuthorLines({
    ctx, authorName: ficInfo.author, maxWidth: width * 0.75
  });

  drawLinesOfText({
    ctx,
    width,
    lines: authorLines,
    separator,
    maxLines: 2,
    lineStart: height * 0.82,
    lineHeight: 77,
  });

  // Add the title.
  //
  // This may be split across multiple lines if it's long; we only
  // show part of the title if it's long to keep the text readable.
  //
  // If there are too many lines, we truncate it and add ellipsis
  // to indicate it's been truncated.
  ctx.fillStyle = '#ffffff';
  ctx.font = '88px Georgia';

  const titleLines = getTitleLines({
    ctx, title: ficInfo.title, maxWidth: width * 0.75,
  });

  drawLinesOfText({
    ctx,
    width,
    lines: titleLines,
    separator: " ",
    maxLines: 5,
    lineStart: height * 0.18,
    lineHeight: 112,
  });

  return canvas;
}



/**
 * Given a list of words, work out how to fit them into lines on
 * a <canvas> without exceeding the max width.
 */
function getLinesForWords({ ctx, words, maxWidth, separator }) {
    var lines = [];
    var currentLine = words[0];

    // Go through the words one-by-one.  If adding this word causes
    // us to exceeed the width of the current line, create a new line
    // and push the word down.
    for (var i = 1; i < words.length; i++) {
        var thisWord = words[i]
        var candidateLine = currentLine + separator + thisWord;

        var width = ctx.measureText(candidateLine).width;

        if (width < maxWidth) {
            currentLine = candidateLine;
        } else {
            lines.push(currentLine);
            currentLine = thisWord;
        }
    }

    // Remember to add a line for anything not already tracked.
    lines.push(currentLine);

    return { lines, separator };
}



/**
 * Split a title into lines to fit into a <canvas> without wrapping.
 */
function getTitleLines({ ctx, title, maxWidth }) {
  const { lines } = getLinesForWords({
    ctx, words: title.split(" "), maxWidth, separator: " "
  });

  return lines;
}



/**
 * Split an author name into lines to fit into a <canvas>.
 *
 * We try to apply some intelligence when we need to break across lines,
 * e.g. breaking on spaces or uppercase characters.
 *
 * We only have room for two lines of text in the author name, so
 * anything beyond that gets truncated.
 */
function getAuthorLines({ ctx, authorName, maxWidth }) {

  // If the author name includes any spaces, assume we have a list
  // of space separated words we can use.
  if (authorName.includes(' ')) {
    return getLinesForWords({
      ctx, words: authorName.split(" "), maxWidth, separator: " "
    });
  }

  // Another common convention is to use underscores, in which
  // case we can split on that.
  else if (authorName.includes('_')) {
    return getLinesForWords({
      ctx, words: authorName.split("_"), maxWidth, separator: "_"
    });
  }

  // Another common convention is to use intercaps, e.g. JaneSmith,
  // so we can split on those words if we need to.
  else if (/[A-Z]/.test(authorName)) {
    return getLinesForWords({
      ctx,
      words: authorName.replace(/([A-Z])/g, ' $1').trim().split(/\s+/),
      maxWidth,
      separator: ""
    });
  }

  // Otherwise, we just break the string into individual characters
  // and fit as many as we can onto each line.
  else {
    return getLinesForWords({
      ctx,
      words: [...authorName],
      maxWidth,
      separator: ""
    });
  }
}




/**
 * Add lines of text to a canvas.
 *
 * The text will be drawn in the middle of the page.
 */
function drawLinesOfText({ ctx, width, lines, separator, maxLines, lineStart, lineHeight }) {

  // If there are more lines than we can fit, truncate to that length
  // and add an ellipsis.
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] += '…';
  }

  // Got through and add the lines of text we're drawing.  Depending
  // on the separator, we may need to add a hyphen or similar to
  // indicate line continuation.
  for (lineno = 0; lineno < lines.length; lineno++) {
    const thisLine = lines[lineno];

    const displayLine =
      separator === " " ? thisLine
        : separator === "_" ? thisLine + "_"
        : lineno < lines.length - 1 ? thisLine + "-"
        : thisLine;

    ctx.fillText(displayLine, width / 2, lineStart + lineno * lineHeight);
  }
}



/**
 * Shuffle the elements of an array.
 *
 * This code is a Fisher–Yates (aka Knuth) Shuffle, taken from
 * a Stack Overflow community wiki answer:
 * https://stackoverflow.com/a/2450976/1558022
 */
function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}