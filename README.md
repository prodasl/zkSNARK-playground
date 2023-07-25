# circom-playground

This repo is for playing around with the [circom](https://github.com/iden3/circom) zkp library. 

## Building the Docker environment

```
docker build -t circom .
```

## Running the docker environment

```
docker run -it --rm --entrypoint bash -v /home/todd/code/circom-playground/:/circom/circuits circom
```