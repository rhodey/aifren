# AiFren(d)
Small voice assistant that runs on linux with and without docker

AiFren grew into [Hecate](https://github.com/rhodey/hecate) and now I use this smaller repo to prototype Hecate audio changes

## Setup
AiFren requires [tinfoil.sh](https://tinfoil.sh/) for private inference and a small config for shared microphone
```
cp example.env .env
cp .asoundrc ~/.asoundrc
```

## Docker run
```
just build
just run
just run \
  --audio whisper-large-v3-turbo \
  --llm llama3-3-70b \
  --rate-out 48000 \
  --voice 'en+f3' \
  --no-playback
```

## Native run
Rust [earshot](http://crates.io/crates/earshot) adds [voice activity detection](https://en.wikipedia.org/wiki/Voice_activity_detection)
```
cargo build --release
```

Then
```
npm install
npm start
npm start -- \
  --audio whisper-large-v3-turbo \
  --llm llama3-3-70b \
  --rate-out 48000 \
  --voice 'en+f3' \
  --no-playback
```

## License
mike@rhodey.org

MIT
