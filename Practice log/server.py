import http.server
import socketserver
import webbrowser
import threading
import sys
import os

PORT = 8080

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep console clean
        pass

def open_browser():
    webbrowser.open(f'http://localhost:{PORT}/index.html')

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Try PORT, or next available
    server = None
    for p in range(PORT, PORT + 20):
        try:
            server = socketserver.TCPServer(("", p), QuietHandler)
            PORT = p
            break
        except OSError:
            continue

    if not server:
        print("포트를 열 수 없습니다. index.html을 직접 더블 클릭하여 실행하세요.")
        sys.exit(1)

    print(f"=====================================================")
    print(f"벨리댄스 연습일지가 실행되었습니다.")
    print(f"브라우저 접속 주소: http://localhost:{PORT}/index.html")
    print(f"종료하려면 이 창에서 Ctrl+C를 누르세요.")
    print(f"=====================================================")

    threading.Timer(0.8, open_browser).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
        server.server_close()
