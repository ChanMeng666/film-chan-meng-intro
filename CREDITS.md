# Credits

## Picture

| Item | Use | Licence |
|---|---|---|
| Anton | display type | SIL OFL 1.1 (`src/fonts/OFL-Anton.txt`) |
| JetBrains Mono | the HUD and the signature line | SIL OFL 1.1 (`src/fonts/OFL-JetBrainsMono.txt`) |
| puppeteer-core | drives headless Chrome, one frame at a time | Apache 2.0 |
| ffmpeg | encodes and muxes the film | LGPL / GPL |

No image or video generation model, photograph or footage is used for the picture.

The film's visual grammar (beat-locked plate cuts, type that bleeds off the frame, a pair of
silence and impact, a second pass in a changed material) was studied from *NULL//BLOOM* by
g_t_u on bilibili. No code, footage or asset from that film is used here. Its symbols and
palette are replaced by Chan Meng's own orange pixel, ordered dither and brand tokens.

## Sound

Every sound in the score is a recorded sample placed by `audio/score.py`. The only non-sample
element is the reverb impulse response, which is shaped noise.

| Library | Used for | Licence |
|---|---|---|
| [Big Rusty Drums](https://github.com/sfzinstruments/karoryfer.big-rusty-drums), Karoryfer Samplecraft | kick, snare, hi-hat, crash, toms, reversed crash swells | CC0 1.0 |
| [Splendid Grand Piano](https://github.com/sfzinstruments/SplendidGrandPiano) | piano | Public domain |
| [Karoryfer × bigcat Cello](https://github.com/sfzinstruments/karoryfer-bigcat.cello) | sustained strings | CC0 1.0 |
| [Karoryfer Meatbass](https://github.com/sfzinstruments/karoryfer.meatbass) | upright bass | CC0 1.0 |
| [VCSL](https://github.com/sgossner/VCSL), Versilian Community Sample Library | glockenspiel, vibraphone | CC0 1.0 |

The samples are not stored in this repository. `scripts/fetch_samples.sh` downloads them,
pinned to exact commits. `audio/samplers.py` and that script come from
[film-archlang-one-take](https://github.com/ChanMeng666/film-archlang-one-take) (MIT).
