#!/usr/bin/env python3
"""
This script builds and deploys the app to my web server, which means:

1.  Compiling everything into a single HTML file
2.  Uploading that HTML file to my web server

"""

from pathlib import Path
import subprocess


if __name__ == "__main__":
    out_dir = Path("dist")
    out_dir.mkdir(exist_ok=True)

    html = Path("index.html").read_text()
    html = html.replace(
        '<script src="static/app.js"></script>',
        '<script id="app">' + Path("static/app.js").read_text() + "</script>",
    )
    html = html.replace(
        '<script src="static/jszip.min.js"></script>',
        '<script id="jsmin">' + Path("static/jszip.min.js").read_text() + "</script>",
    )
    assert "<script src" not in html

    (out_dir / "index.html").write_text(html)

    subprocess.check_call(
        [
            "ssh",
            "alexwlchan@alexwlchan.net",
            "mkdir -p repos/alexwlchan.net/_site/tools/add-cover-to-ao3-epubs",
        ]
    )
    subprocess.check_call(
        [
            "scp",
            str(out_dir / "index.html"),
            "alexwlchan@alexwlchan.net:repos/alexwlchan.net/_site/tools/add-cover-to-ao3-epubs/index.html",
        ]
    )
