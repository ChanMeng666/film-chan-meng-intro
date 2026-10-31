<div align="center">

# Chan Meng · motion intro

**A 52-second intro film for [Chan Meng](https://github.com/ChanMeng666), written as code.**

Every frame is a pure function of its index, drawn from her brand tokens and cut on one beat table that the score reads too.

</div>

<!-- FILM: chan-meng-motion-intro -->

<div align="center">

**Watch on YouTube:** [youtu.be/hT0eKa8tYOo](https://youtu.be/hT0eKa8tYOo) · **Download:** [release v1.0.0](https://github.com/ChanMeng666/film-chan-meng-intro/releases/tag/v1.0.0) · **More films:** [chanmeng.org/films](https://chanmeng.org/films) · [Credits](CREDITS.md)

</div>

## How it is made

| | |
|---|---|
| Format | 52.5 s, 1920×1080, 30 fps, H.264 + AAC 320 kb/s |
| Timing | 128 BPM, 112 beats. `timeline.json` is the one table the picture and the score both read |
| Picture | Canvas 2D in headless Chrome, colours and motion parameters from `brand/tokens.json`, no image or video generation |
| Sound | a score written in Python, played by recorded samples from CC0 and public-domain libraries |
| Loudness | −16.0 LUFS integrated, true peak −1.6 dBTP, measured on the delivered file |
| Flash safety | whole frame peaks at 2 transitions a second; no one-second window over the WCAG 2.3.1 limit (grid estimate, not a Harding test) |

## Rebuild it

Needs Node, Python, ffmpeg and Chrome. Set `CHROME` when Chrome is not at its default Windows path.

```bash
npm install
pip install -r requirements.txt
npm run samples   # downloads the pinned sample libraries, about 0.6 GB
npm run score     # writes dist/score.wav
npm run render    # writes dist/chan-meng-intro.mp4
```

The score uses fixed seeds, so the same script writes the same audio.

## Licence

Code is [MIT](LICENSE). The film, its score and the poster are [CC BY 4.0](LICENSE-MEDIA.md). Samples and fonts keep their own terms: see [CREDITS.md](CREDITS.md).
