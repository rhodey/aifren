# ai fren
ai fren voice assistant runs on linux with and without docker

ffmpeg is platform independent and is used for mic and speaker

mac and windows can be made to work easy by read these [two](src/mic.js) [files](src/speaker.js)

## setup
ai fren requires [tinfoil.sh](https://tinfoil.sh/) for private inference
```
cp example.env .env
```

## docker run
```
just build
just run
just run \
  --audio voxtral-small-24b \
  --llm llama3-3-70b \
  --rate-out 48000 \
  --voice 'en+f3' \
  --no-playback
```

## native run
rust [earshot](http://crates.io/crates/earshot) adds [voice activity detection](https://en.wikipedia.org/wiki/Voice_activity_detection)
```
cargo build --release
```

then
```
npm install
npm start
npm start -- \
  --audio voxtral-small-24b \
  --llm llama3-3-70b \
  --rate-out 48000 \
  --voice 'en+f3' \
  --no-playback
```

## roadmap
i plan to move this into browser world

i want to do character animations to give the ai a body

i wanted to succeed with cli first for fun

## license
mike@rhodey.org

mit
