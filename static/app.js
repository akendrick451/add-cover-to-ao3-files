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



if (typeof module !== 'undefined') {
  module.exports = { findContentOpfPath };
}
