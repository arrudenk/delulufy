"""Еталонні куспіди домів із Swiss Ephemeris -> JSON"""
import swisseph as swe, json, sys, random

random.seed(11)
rows = []
SYS = {'placidus': b'P', 'porphyry': b'O', 'equal': b'A', 'whole': b'W'}
for _ in range(400):
    y = random.randint(1870, 2080)
    jd = swe.julday(y, random.randint(1, 12), random.randint(1, 28),
                    random.randint(0, 23) + random.randint(0, 59) / 60.0)
    lat = random.uniform(-60, 65)
    lon = random.uniform(-180, 180)
    row = {'jd': jd, 'lat': lat, 'lon': lon, 'sys': {}}
    ok = True
    for name, code in SYS.items():
        try:
            cusps, ascmc = swe.houses(jd, lat, lon, code)
        except Exception:
            ok = False
            break
        row['sys'][name] = list(cusps[:12])
        row['asc'] = ascmc[0]
        row['mc'] = ascmc[1]
    if ok:
        rows.append(row)
json.dump(rows, open(sys.argv[1], 'w'))
print('ok', len(rows))
