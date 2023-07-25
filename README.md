# circom-playground

This repo is for playing around with the [circom](https://github.com/iden3/circom) zkp library. 

## Building the Docker environment

```
docker build -t circom .
```

## Running the docker environment

```
docker run -it --rm --entrypoint bash -v /home/todd/code/circom-playground/:/root/circuits circom
```

## Circuit examples

Ready-to-run circuit examples are located in `/examples`. Most of these are straight from the circom docs. 

### Multiplier2

```
# compile the circuit and generate a witness file
cd /examples/multiplier2
circom multiplier2.circom --r1cs --wasm --sym --c
node ./multiplier2_js/generate_witness.js ./multiplier2_js/multiplier2.wasm input.json witness.wtns
# Phase 1 setup ceremony: happens only once ever
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
# Phase 2 setup ceremony: happens once per circuit
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
snarkjs groth16 setup multiplier2.r1cs pot12_final.ptau multiplier2_0000.zkey
snarkjs zkey contribute multiplier2_0000.zkey multiplier2_0001.zkey --name="1st Contributor Name" -v
snarkjs zkey export verificationkey multiplier2_0001.zkey verification_key.json
# Generate Proof
snarkjs groth16 prove multiplier2_0001.zkey witness.wtns proof.json public.json
# Verify Proof (try changing something in proof.json so that the proof doesn't verify)
snarkjs groth16 verify verification_key.json public.json proof.json
```