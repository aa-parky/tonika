#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import random
import os
import sys

def main():
    # Pick a random high port (between 40000–60000)
    port = random.randint(40000, 60000)

    # Ask which page to serve
    print("Which Tonika page do you want to serve?")
    print("1) tonika.html (production root)")
    print("2) developers/dev.html (annotated developer version)")
    choice = input("Enter 1 or 2: ").strip()

    if choice == "1":
        file_to_open = "tonika.html"
    elif choice == "2":
        file_to_open = "developers/dev.html"
    else:
        print("Invalid choice. Defaulting to tonika.html.")
        file_to_open = "tonika.html"

    # Absolute path to file (so open works)
    file_path = os.path.abspath(file_to_open)

    # Start server in project root
    os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), handler) as httpd:
        url = f"http://localhost:{port}/{file_to_open}"
        print(f"Serving {file_to_open} at {url}")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    main()