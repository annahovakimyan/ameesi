"""Download GeoNames and build server/data/places.sqlite.

    python scripts/build_places.py            # download (about 220 MB) and build
    python scripts/build_places.py --no-download

Data © GeoNames (geonames.org), CC BY 4.0. Raw files go in server/data/raw/ (git-ignored).
"""
import argparse
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import places  # noqa: E402

BASE = "https://download.geonames.org/export/dump/"
FILES = ["cities500.zip", "alternateNamesV2.zip", "admin1CodesASCII.txt", "countryInfo.txt"]
RAW = Path(__file__).resolve().parent.parent / "data" / "raw"


def download() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        print(f"downloading {name} …", flush=True)
        urllib.request.urlretrieve(BASE + name, RAW / name)
        if name.endswith(".zip"):
            with zipfile.ZipFile(RAW / name) as z:
                z.extractall(RAW)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-download", action="store_true", help="reuse files already in data/raw")
    parser.add_argument("--out", type=Path, default=places.DEFAULT_DB)
    args = parser.parse_args()
    if not args.no_download:
        download()
    start = time.time()
    places.build(RAW, args.out)
    print(f"built {args.out} in {time.time() - start:.0f}s ({args.out.stat().st_size / 1e6:.0f} MB)")


if __name__ == "__main__":
    main()
