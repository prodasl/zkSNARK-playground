## Part 1: Setting up the Docker Environment

This example uses TypeScript and the Snarkyjs zk library developed by the O(1) Labs team. You can pull 
a pre-built dockerfile will all required environment dependencies:

```
docker pull tthebc01/zksnark-playground
```

and run it like this:

```sh
docker run -it --rm --entrypoint bash -v /path/to/circom-playground:/root/playground tthebc01/zksnark-playground
```

This will start a bash session in the playground environment. Next cd to the directory containing this example:

```sh
cd /root/playground/examples/snickerdoodle-semaphore
```

Once you are in the example folder called `snickerdoodle-semaphore`, you need to install 
dependencies and build the project:

```sh
npm install
npm run build
```

Now you are ready to experiment. 

## Part 2: The Circuit

The Semaphore circuit itself is contained in [`Semaphore.ts``](/examples/snickerdoodle-semaphore/src/Semaphore.ts). This file exports three things:

1. A Merkle Tree Witness object called `MyMerkleWitness` that is configured for an arity of 16 (i.e. 2^16 possible leaves). This will be used to compute the secret membership path belonging to a prover.
2. A special identity structure that takes an `identityNullifier` and an `identityTrapdoor`, both of which are random Field elements that must be kept secret. Taking the Poseidon hash of these two quantities and then hashing that value again results in a public identity commitment. 
3. The Semaphore circuit implementation which allows a prover to prove their membership to a group while preventing replays and message tampering.  

## Part 3: How to Run the Circuit

The usage of the Semaphore circuit is demonstrated in [`run_semaphore.ts`](/examples/snickerdoodle-semaphore/src/run_semaphore.ts). First a kaypair object must be created for the 
circuit by calling `.generateKeypair()` on the circuit object. This keypair is used in its entirety to 
compute a proof. 

The verification key can be extracted from the keypair object by calling `.verificationKey()` on the keypair. The verification key is one of the inputs needed for proof verification. 

If you've already run `npm run build`, you can run the example script like this:

```sh
node run build/src/run_semaphore.js
```
