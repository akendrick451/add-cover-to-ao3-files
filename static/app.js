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



if (typeof module !== 'undefined') {
  module.exports = { chooseColour, findContentOpfPath, getFicInfo };
}
