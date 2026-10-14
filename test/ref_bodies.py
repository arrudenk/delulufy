"""Еталонні довготи світил зі Swiss Ephemeris (режим Moshier) -> JSON"""
import swisseph as swe, json, sys, random

random.seed(3)
IDS = {'sun': swe.SUN, 'moon': swe.MOON, 'mercury': swe.MERCURY, 'venus': swe.VENUS,
       'mars': swe.MARS, 'jupiter': swe.JUPITER, 'saturn': swe.SATURN, 'uranus': swe.URANUS,
       'neptune': swe.NEPTUNE, 'pluto': swe.PLUTO, 'node': swe.TRUE_NODE,
       'meannode': swe.MEAN_NODE, 'lilith': swe.MEAN_APOG}
FLAG = swe.FLG_SWIEPH | swe.FLG_SPEED

rows = []
for _ in range(400):
    jd = swe.julday(random.randint(1850, 2100), random.randint(1, 12), random.randint(1, 28),
                    random.randint(0, 23) + random.randint(0, 59) / 60.0)
    r = {'jd': jd, 'b': {}}
    for name, pid in IDS.items():
        v, _ = swe.calc_ut(jd, pid, FLAG)
        r['b'][name] = {'lon': v[0], 'lat': v[1], 'speed': v[3]}
    rows.append(r)
json.dump(rows, open(sys.argv[1], 'w'))
print('ok', len(rows))
