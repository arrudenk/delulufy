#!/bin/sh
# Звірка з Swiss Ephemeris. Еталони вже згенеровані; щоб перегенерувати:
#   pip3 install pyswisseph && python3 ref_bodies.py ref_bodies.json && python3 ref_houses.py ref_houses.json
set -e
cd "$(dirname "$0")"
node compare_bodies.js
node compare_houses.js
echo "усі перевірки пройдено"
