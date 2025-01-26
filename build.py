#!/usr/bin/env python3

from pathlib import Path


if __name__ == '__main__':
    out_dir = Path("dist")
    out_dir.mkdir(exist_ok=True)
    
    html = Path("index.html").read_text()
    html = html.replace(
        '<script src="static/app.js"></script>',
        '<script id="app">' + Path("static/app.js").read_text() + '</script>'
    )
    html = html.replace(
        '<script src="static/jszip.min.js"></script>',
        '<script id="jsmin">' + Path("static/jszip.min.js").read_text() + '</script>'
    )
    assert '<script src' not in html
    
    (out_dir / "index.html").write_text(html)
