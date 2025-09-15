#!/usr/bin/env python3
"""
Simple HTTP server for serving Tonika locally.
Automatically opens tonika.html in the default browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

# Default port
PORT = 8000

def find_available_port(start_port=8000, max_attempts=10):
    """Find an available port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socketserver.TCPServer(("", port), None) as temp_server:
                return port
        except OSError:
            continue
    return None

def main():
    # Change to project root directory (parent of tools)
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    # Find available port
    port = find_available_port(PORT)
    if port is None:
        print(f"Error: Could not find available port starting from {PORT}")
        sys.exit(1)

    # Create server
    handler = http.server.SimpleHTTPRequestHandler

    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"Serving Tonika at http://localhost:{port}/")
            print(f"Opening tonika.html in browser...")
            print("Press Ctrl+C to stop the server")

            # Open browser automatically
            webbrowser.open(f"http://localhost:{port}/tonika.html")

            # Start server
            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
