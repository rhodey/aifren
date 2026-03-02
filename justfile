sudo := "$(docker info > /dev/null 2>&1 || echo 'sudo')"
audio := "--device /dev/snd --group-add audio"

build:
  {{sudo}} docker build -f Dockerfile -t aifren .

run *args:
  mkdir -p fren/
  {{sudo}} docker rm -f aifren > /dev/null 2>&1 || true
  {{sudo}} docker run --name aifren --rm -it --env-file .env -v ./fren:/app/fren {{audio}} aifren {{args}}
