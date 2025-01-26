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
function findContentOpfPath(zip) {
  const path =
    Object.keys(zip.files)
      .find(f =>
        f === 'content.opf' || f.endsWith('/content.opf')
      );
  
  return path || null;
}



/**
 * Given the contents of the `content.opf` file, return certain key
 * information like the title, author, and fandom.
 */
function getFicInfo(xml) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");
  
  const namespaceResolver = (prefix) =>
    prefix === 'dc' ? 'http://purl.org/dc/elements/1.1/' : null;
  
  const STRING_TYPE = 2;  // XPathResult.STRING_TYPE
  
  // The title of the fic will be in a <dc:title> node, for example:
  //
  //     <dc:title>Operation Cameo</dc:title>
  //
  const title = xmlDoc.evaluate(
    './/dc:title',
    xmlDoc,
    namespaceResolver,
    STRING_TYPE,
    null
  ).stringValue;
  
  // The author of the fic will be in a <dc:author> node, for example:
  //
  //     <dc:creator …>alexwlchan</dc:creator>
  //
  const author = xmlDoc.evaluate(
    './/dc:creator',
    xmlDoc,
    namespaceResolver,
    STRING_TYPE,
    null
  ).stringValue;
  
  // The fandom is the *third* of the <dc:subject> nodes, for example:
  //
  //    <dc:subject>Fanworks</dc:subject>
  //    <dc:subject>General Audiences</dc:subject>
  //    <dc:subject>Operation Mincemeat: A New Musical - SpitLip</dc:subject>
  //
  // The first subject is always "Fanworks", and it looks like the rating
  // is always the second subject.
  //
  // See comment in the AO3 codebase here:
  // https://github.com/otwcode/otwarchive/blob/2362dd772452a71dda9c62409b935f275a0d131f/app/models/download_writer.rb#L162-L164
  const fandom = xmlDoc.evaluate(
    './/dc:subject[3]',
    xmlDoc,
    namespaceResolver,
    STRING_TYPE,
    null
  ).stringValue;
  
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
  
  // This is a simple hashing function which gets us a random-ish
  // hue in the random 0–359.
  let hash = 0;
  for (let i = 0; i < fandom.length; i++) {
    const char = fandom.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const hue = (Math.abs(hash) % 360) / 360;
  
  // The saturation/lightness values are chosen to get a dark-ish
  // shade that will look good with white text.
  const saturation = 1.0;
  const lightness = 0.25;
  
  // Convert to rgb.
  let [red, green, blue] = hslToRgb(hue, saturation, lightness);
  
  // Convert to a hex string.
  return `#${numToHex(red)}${numToHex(green)}${numToHex(blue)}`;
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
  ctx.fillStyle = chooseColour(ficInfo.fandom);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Set text style.  We know white will look okay because we
  // chose a dark background.
  ctx.fillStyle = 'white';
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
  
  console.log(lines);
  
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