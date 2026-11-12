#!/usr/bin/env python3
"""A local server that behaves like GitHub Pages for measurements: gzip for text types, ETag/Last-Modified revalidation and
`Cache-Control: max-age=600`. Used by tools/audit/*.py (the plain http.server sends everything uncompressed, which makes a
throttled load look 4x heavier than the live site).

    from serve import serve; base = serve(ROOT)        # -> "http://127.0.0.1:PORT/"
"""
import functools, gzip, http.server, os, socket, threading

TEXT = (".html", ".js", ".css", ".json", ".svg", ".txt", ".md", ".webmanifest", ".xml", ".map")
_cache = {}


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "max-age=600")
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")
        if not os.path.isfile(path) or not path.endswith(TEXT) or "gzip" not in self.headers.get("Accept-Encoding", ""):
            return super().send_head()
        st = os.stat(path)
        key = (path, st.st_mtime_ns, st.st_size)
        if key not in _cache:
            with open(path, "rb") as f:
                _cache[key] = gzip.compress(f.read(), 6)
        body = _cache[key]
        etag = '"%x-%x"' % (st.st_mtime_ns, st.st_size)
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304); self.send_header("ETag", etag); self.send_header("Content-Length", "0"); self.end_headers()
            return None
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("ETag", etag)
        self.end_headers()
        import io
        return io.BytesIO(body)


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, *a):          # a page closed mid-transfer is not an error worth printing
        pass


def serve(root):
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    httpd = Server(("127.0.0.1", port), functools.partial(Handler, directory=root))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/"


if __name__ == "__main__":
    import sys, time
    print(serve(sys.argv[1] if len(sys.argv) > 1 else os.getcwd())); time.sleep(10 ** 9)
