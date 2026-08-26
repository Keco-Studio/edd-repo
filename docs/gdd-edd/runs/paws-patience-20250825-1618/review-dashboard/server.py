from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


UTF8_EXTENSIONS = {
    ".css",
    ".gd",
    ".godot",
    ".html",
    ".js",
    ".json",
    ".jsonl",
    ".md",
    ".tscn",
    ".txt",
}


class Utf8StaticHandler(SimpleHTTPRequestHandler):
    """为项目中的文本文件明确声明 UTF-8，避免中文被浏览器按 GBK 解码。"""

    def guess_type(self, path: str) -> str:
        content_type = super().guess_type(path)
        if Path(path).suffix.lower() in UTF8_EXTENSIONS and "charset=" not in content_type:
            return f"{content_type}; charset=utf-8"
        return content_type


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the Paws & Patience review dashboard.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--directory", required=True)
    args = parser.parse_args()

    handler = partial(Utf8StaticHandler, directory=args.directory)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
