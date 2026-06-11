import urllib.request
import os

def download_file(url, filepath):
    print(f"Downloading {url} to {filepath}...")
    try:
        urllib.request.urlretrieve(url, filepath)
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    os.makedirs("matching-engine", exist_ok=True)
    
    # cpp-httplib single header release
    httplib_url = "https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h"
    download_file(httplib_url, os.path.join("matching-engine", "httplib.h"))
    
    # nlohmann/json single header release (v3.11.3)
    json_url = "https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp"
    download_file(json_url, os.path.join("matching-engine", "json.hpp"))
