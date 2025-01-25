/* The `content.opf` file contains XML metadata about an ePub file.
 *
 * Look inside an ePub file unpacked by JSZip, and return the path
 * to the `content.opf` file it contains (if any).
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



/* Given the contents of the `content.opf` file, return certain key
 * information like the title, author, and fandom. */
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



if (typeof module !== 'undefined') {
  module.exports = { findContentOpfPath, getFicInfo };
}
