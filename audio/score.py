#!/usr/bin/env python3
"""The score of the intro film, written on the same timeline.json the picture reads.
Every sound is a recorded sample from a CC0 or public-domain library (see CREDITS.md).
Fixed seeds: the same script writes the same audio.
   bash scripts/fetch_samples.sh && python audio/score.py"""
import json, pathlib
import numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.ndimage import maximum_filter1d, uniform_filter1d
import samplers as S

ROOT = pathlib.Path(__file__).resolve().parents[1]
TL = json.load(open(ROOT / 'timeline.json', encoding='utf8'))
SR = S.SR; BEAT = 60 / TL['bpm']
at, b0 = {}, 0
for s in TL['sections']:
    at[s['id']] = b0; b0 += s['beats']
END_BEAT = b0; DUR = END_BEAT * BEAT; N = int((DUR + 3) * SR)
TR = {k: np.zeros((N, 2), np.float32) for k in ('kick', 'drums', 'bass', 'keys', 'strings', 'bells', 'sfx')}
db = lambda x: 10 ** (x / 20)

def put(trk, x, beat, gain=0.0, pan=0.0, hold=None, rel=.3):
    """Place a sample at a beat. hold and rel are in seconds."""
    x = x / max(float(np.abs(x).max()), 1e-6)
    if hold is not None:
        n, r = int(hold * SR), int(rel * SR); x = x[:n + r].copy()
        if len(x) > n: x[n:n + r] *= np.linspace(1, 0, min(r, len(x) - n))[:, None]
    th = (pan + 1) * np.pi / 4; x = x * np.array([np.cos(th), np.sin(th)], np.float32) * np.sqrt(2) * db(gain)
    i = int(round(beat * BEAT * SR)); e = min(N, i + len(x))
    if 0 <= i < N: TR[trk][i:e] += x[:e - i]

# D minor: Dm Bb F C, a bar each; the film ends on F, the relative major.
PROG = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [41, 48, 53, 57, 60], [48, 55, 60, 64, 67]]
ROOTS = [38, 34, 29, 36]
chord = lambda b: PROG[int(b // 4) % 4]
root = lambda b: ROOTS[int(b // 4) % 4]
# The pixel's motif: three rising notes that end where the film ends.
MOTIF = [(0, 81), (1.5, 84), (3, 86)]

def groove(a, b, hats=8, ghost=False):
    for bt in np.arange(a, b, 1.0):
        i = int(bt - a) % 4
        if i in (0, 2): put('kick', S.kick(.85), bt, -4)
        else: put('drums', S.snare(.75), bt, -7, .04)
        if ghost and i == 3: put('kick', S.kick(.55), bt + .5, -10)
    step = 4 / hats * .5
    for k, bt in enumerate(np.arange(a, b, step)):
        put('drums', S.hat(.35 + .2 * (k % 2 == 0)), bt, -17 - 3 * (k % 2), .25)

def bassline(a, b):
    for bar in np.arange(a, b, 4.0):
        r = root(bar - a)
        for beat, n in ((0, r), (1.5, r + 12), (2, r), (3.5, r + 7)):
            put('bass', S.BASS.note(n, .8), bar + beat, -6 if beat == 0 else -9, 0, hold=.42, rel=.15)

def arp(a, b, vel=.5, gain=-10, oct_=0):
    pat = (0, 2, 4, 2, 3, 2, 4, 2)
    for bar in np.arange(a, b, 4.0):
        t = [m + 12 * oct_ for m in chord(bar - a)]
        for i in range(8):
            put('keys', S.PIANO.note(t[pat[i]], vel + (.1 if i % 4 == 0 else 0)), bar + i * .5, gain + (2 if i % 4 == 0 else 0), -.2 + .05 * i, hold=.5, rel=.5)

def pads(a, b, vel=.45, gain=-10):
    for bar in np.arange(a, b, 4.0):
        c = chord(bar - a)
        put('strings', S.CELLO.note(c[0], vel), bar, gain, -.2, hold=4 * BEAT - .05, rel=.4)
        put('strings', S.CELLO.note(c[1] + 12, vel), bar, gain - 4, .2, hold=4 * BEAT - .05, rel=.4)

def hit(beat, gain=-4, crash=True):
    put('kick', S.kick(1.0), beat, gain + 1)
    if crash: put('drums', S.crash(.9), beat, gain)

def swell(beat, beats=2.0, gain=-9):
    n = int(beats * BEAT * SR); x = S.crash(.9); y = x[:n * 2][::-1][-n:].copy()
    y *= np.linspace(0, 1, len(y))[:, None] ** 2
    put('sfx', y, beat - beats, gain)

def fill(beat):
    for i, (dt, size) in enumerate(((0, 15), (.5, 15), (1, 18), (1.5, 22))):
        put('drums', S.tom(size, .8), beat + dt, -8, (-.3, -.1, .1, .3)[i])

# hold: one low note, then the pixel arrives with one bell on beat 4 of the picture.
h = at['hold']
put('keys', S.PIANO.note(38, .3), h, -8, 0, hold=3, rel=1.5)
pads(h + 4, h + 8, .3, -14)
put('bells', S.GLOCK.note(81, .5), h + 4, -8, .1)
swell(at['name'])

# name: two hits.
n = at['name']
for i, bt in enumerate((n, n + 2)):
    hit(bt, -4, crash=i == 0)
    for m in PROG[i][:5]: put('keys', S.PIANO.note(m, .85), bt, -8, 0, hold=.8, rel=.8)

# story: the band comes in under four lines.
s = at['story']
groove(s, s + 16); bassline(s, s + 16); arp(s, s + 16, .42, -12); pads(s, s + 16, .4, -12)
for i in range(4): put('bells', S.GLOCK.note(MOTIF[i % 3][1], .5), s + i * 4, -11, .15)

# outline: hats double, the snare climbs into the tunnel.
o = at['outline']
groove(o, o + 8, hats=16, ghost=True); bassline(o, o + 8); arp(o, o + 8, .5, -11); pads(o, o + 8, .5, -11)
for i in range(16): put('drums', S.snare(.3 + .04 * i), o + 4 + i * .25, -15 + .4 * i)
swell(at['tunnel'])

# first pass, tunnel to storm.
t = at['tunnel']; hit(t)
groove(t, t + 8, hats=16, ghost=True); bassline(t, t + 8); arp(t, t + 8, .6, -9); pads(t, t + 8, .6, -9)
m = at['mosaic']; hit(m, -6)
groove(m, m + 8, hats=16, ghost=True); bassline(m, m + 8); arp(m, m + 8, .6, -9, oct_=1); pads(m, m + 8, .6, -9)
for bt in (0, 2, 4):
    for i, (d, p) in enumerate(MOTIF): put('bells', S.GLOCK.note(p, .7), m + bt + d * .25, -9, -.2 + .2 * i)
st = at['storm']; hit(st); hit(st + 4, -5)
for bt in np.arange(st, st + 8): put('kick', S.kick(.9), bt, -4)
for i in range(32): put('drums', S.hat(.5), st + i * .25, -15, .25)
for bt in np.arange(st + 1, st + 8, 2): put('drums', S.snare(.85), bt, -6, .04)
bassline(st, st + 8); pads(st, st + 8, .75, -7); fill(st + 6)

# breakdown: piano and cello, one bell for each line.
r = at['roles']
put('keys', S.PIANO.note(38, .5), r, -6, 0, hold=3, rel=1.5)
for bar in np.arange(r, r + 12, 4.0):
    c = chord(bar - r)
    for i, idx in enumerate((2, 3, 4, 3, 2, 3, 4, 3)):
        put('keys', S.PIANO.note(c[idx] + 12, .32), bar + i * .5, -12, -.2 + .06 * i, hold=.7, rel=1.0)
pads(r, r + 12, .3, -12)
for i in range(3): put('bells', S.VIBES.note(MOTIF[i][1] - 12, .6), r + i * 4, -9, .1)

# silence: nothing at all until the swell of the last two beats.
swell(at['tunnel2'], 2.0, -7)

# second pass: the same parts, higher.
t2 = at['tunnel2']; hit(t2, -3)
groove(t2, t2 + 8, hats=16, ghost=True); bassline(t2, t2 + 8); arp(t2, t2 + 8, .65, -9, oct_=1); pads(t2, t2 + 8, .7, -8)
m2 = at['mosaic2']; hit(m2, -5)
groove(m2, m2 + 8, hats=16, ghost=True); bassline(m2, m2 + 8); arp(m2, m2 + 8, .7, -8, oct_=1); pads(m2, m2 + 8, .7, -8)
for bt in (0, 2, 4, 6):
    for i, (d, p) in enumerate(MOTIF): put('bells', S.GLOCK.note(p, .8), m2 + bt + d * .25, -8, -.2 + .2 * i)
ra = at['radial']; hit(ra, -3); hit(ra + 4, -4)
groove(ra, ra + 8, hats=16, ghost=True); bassline(ra, ra + 8); arp(ra, ra + 8, .75, -8, oct_=1); pads(ra, ra + 8, .8, -7); fill(ra + 6)

# close: F major, then the bell of the pixel landing as the full stop on beat 7.
c = at['close']; hit(c, -3)
for m_ in (29, 41, 53, 60, 65, 69, 72): put('keys', S.PIANO.note(m_, .9), c, -5, 0, hold=3.2, rel=2.0)
put('strings', S.CELLO.note(41, .85), c, -5, -.1, hold=8 * BEAT, rel=2.0); put('strings', S.CELLO.note(53, .7), c, -8, .2, hold=8 * BEAT, rel=2.0)
put('bass', S.BASS.note(29, .9), c, -3, 0, hold=1.6)
put('bells', S.GLOCK.note(84, .8), c + 7, -6, .1); put('keys', S.PIANO.note(89, .55), c + 7, -9, -.1, hold=.9, rel=2.0)

# Mix.
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x, axis=0)
TR['bass'] = filt(TR['bass'], 'low', 1400)
TR['strings'] = filt(TR['strings'], 'high', 110)
TR['bells'] = filt(TR['bells'], 'high', 350)
env = np.abs(TR['kick']).max(1); hop = 64
env = np.minimum(1, maximum_filter1d(env, int(.09 * SR)) * 1.4); env = uniform_filter1d(env, int(.03 * SR))
for trk, d in (('bass', .4), ('keys', .25), ('strings', .35)): TR[trk] = TR[trk] * (1 - d * env)[:, None]
GAIN = {'kick': -1, 'drums': -2, 'bass': -1, 'keys': -2, 'strings': -3, 'bells': -2, 'sfx': -3}
SEND = {'kick': 0, 'drums': .05, 'bass': 0, 'keys': .2, 'strings': .25, 'bells': .35, 'sfx': .15}
dry = sum(TR[k] * db(GAIN[k]) for k in TR)
send = sum(TR[k] * db(GAIN[k]) * SEND[k] for k in TR)
rng = np.random.default_rng(20261031); n_ir = int(1.8 * SR)
ir = rng.standard_normal((n_ir, 2)) * np.exp(-np.linspace(0, 8, n_ir))[:, None]
ir = filt(ir, 'band', [300, 6000]); ir /= np.sqrt((ir ** 2).sum(0)).max()
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = dry + wet * .7
end = int(DUR * SR); mix = mix[:end].copy()
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
loud = pyln.Meter(SR).integrated_loudness(mix)
mix = mix * db(-16 - loud)
ceiling = db(-1.8); look = int(.003 * SR)
peak = maximum_filter1d(np.abs(mix).max(1), 2 * look + 1)
gain = np.minimum(1, ceiling / np.maximum(peak, 1e-9)); gain = uniform_filter1d(gain, look)
gain = np.minimum(gain, np.minimum(1, ceiling / np.maximum(peak, 1e-9)))
mix = mix * gain[:, None]
(ROOT / 'dist').mkdir(exist_ok=True)
sf.write(ROOT / 'dist' / 'score.wav', mix, SR, subtype='PCM_24')
print(f'{DUR:.3f} s, {END_BEAT} beats, loudness before gain {loud:.1f} LUFS, limiter min gain {gain.min():.2f}')
