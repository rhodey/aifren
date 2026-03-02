# ai fren
ai fren voice assistant runs on linux with and without docker

ffmpeg is platform independent and is used for mic and speaker

mac and windows can be made to work easy by read these [two](src/mic.js) [files](src/speaker.js)

when run using docker `mimic` is installed for primitive text-to-speech

## setup
ai fren requires [tinfoil.sh](https://tinfoil.sh/) for private inference
```
cp example.env .env
```

## docker run
```
just build
just run
just run --audio voxtral-small-24b --llm llama3-3-70b --no-playback
```

## native run
```
npm install
npm start
npm start -- --audio voxtral-small-24b --llm llama3-3-70b --no-playback
```

## license
mike@rhodey.org

mit
