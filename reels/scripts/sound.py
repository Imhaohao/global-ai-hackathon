"""Synthesises the reel's few sound effects into public/audio/sfx: a phone key click, an SMS arrival chirp,
a scan sweep, a soft whoosh, a low hit and a camera shutter.

  python3 scripts/sound.py
"""

from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

RATE = 44100
OUT = Path(__file__).resolve().parents[1] / "public" / "audio" / "sfx"
rng = np.random.default_rng(11)


def timeline(duration):
    return np.arange(int(duration * RATE)) / RATE


def envelope(t, attack, decay):
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def band(signal, kind, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype=kind, fs=RATE, output="sos"), signal)


def noise(duration):
    return rng.standard_normal(int(duration * RATE))


def key():
    t = timeline(0.07)
    click = band(noise(0.07), "bandpass", [1800, 7000]) * envelope(t, 0.0003, 0.004)
    body = np.sin(2 * np.pi * 900 * t) * envelope(t, 0.0005, 0.01) * 0.3
    return (click + body) * 0.5


def chirp_note(t, frequency):
    tone = np.sin(2 * np.pi * frequency * t) + 0.25 * np.sin(2 * np.pi * frequency * 2 * t)
    return tone * envelope(t, 0.003, 0.09)


def sms():
    t = timeline(0.5)
    first = chirp_note(t, 1318.5)
    second = np.roll(chirp_note(t, 1760.0), int(0.13 * RATE))
    second[: int(0.13 * RATE)] = 0
    return (first + second) * 0.28


def scan():
    t = timeline(1.0)
    shape = np.sin(np.pi * t / 1.0) ** 2
    frequency = 600 + 1800 * t
    tone = np.sin(2 * np.pi * np.cumsum(frequency) / RATE) * 0.12
    air = band(noise(1.0), "bandpass", [2500, 9000]) * 0.18
    return (tone + air) * shape * 0.6


def whoosh():
    t = timeline(0.6)
    shape = np.sin(np.pi * t / 0.6) ** 2
    raw = noise(0.6)
    blend = t / 0.6
    return (band(raw, "bandpass", [250, 1200]) * (1 - blend) + band(raw, "bandpass", [1200, 6000]) * blend) * shape * 0.35


def hit():
    t = timeline(0.8)
    frequency = 50 + 120 * np.exp(-t * 16)
    body = np.sin(2 * np.pi * np.cumsum(frequency) / RATE) * envelope(t, 0.001, 0.18)
    return np.tanh(body * 1.3) * 0.55


def shutter():
    t = timeline(0.16)
    first = band(noise(0.16), "bandpass", [1200, 8000]) * envelope(t, 0.0003, 0.007)
    second = np.roll(first, int(0.06 * RATE)) * 0.7
    return (first + second) * 0.45


def write(name, signal):
    peak = np.max(np.abs(signal)) or 1
    pcm = (signal / max(peak, 1.0) * 32767 * 0.9).astype(np.int16)
    wavfile.write(OUT / f"{name}.wav", RATE, pcm)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, build in {"key": key, "sms": sms, "scan": scan, "whoosh": whoosh, "hit": hit, "shutter": shutter}.items():
        write(name, build())
        print("wrote", name)


main()
