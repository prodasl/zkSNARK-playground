# Practical crash course in ZKPs for devs in hurry

I'm making this repo to serve as a teaching aid for a crash course to practical usage of zero-knowledge proofs for developers in a hurry. 
Specifically, I'm basing the tutorial off of the [circom](https://github.com/iden3/circom) zkp library. The repository comes with a 
Dockerfile that is fully self-contained with all dependencies necessary to perform the numerical experiments discussed here.  

## Preliminaries and Context

Zero-knowledge proofs (zkp's) allow a "prover" to convince a "verifier" that a statement is true without letting the cat out of the bag as 
to why the statement is true. The first thing to remember is that in a zkp setting, there is **always** a *prover* and a *verifier*. If you are 
trying to leverage zkps in your application, you must identify the user persona's that fall under these categories (example: if you're using zkp's for
authentication, then the end user is the prover and the backend of your app is the verifier). 

Zero-knowledge proofs (much like the field of machine learning), are not a monolithic concept or single algorithm where one method works
for all use cases. ZKP's form a heterogeneous technology landscape with a large variety of algorithmic techniques and mathematical formalisms 
that each have different tradeoffs with some techniques being more appropriate than others for particular situations. Some zkps are interative, 
others non-interactive, others have the property of succinctness, some are specifically for proving specific statements, etc. It can be 
difficult to know what to use and when. 

Regardless of the particular zkp you end up using in your application, all (useful) zkps must have the following properties:

1. *Completeness* - If the verifier is being honest, then the prover can convince them beyond a shadow of a doubt that a true statement is indeed true
2. *Soundness* - If a statement is false, a malicous prover cannot trick a verifier into thinking it is true
3. *Zero-Knowledge* - a verifier learns nothing other than the truthyness of a statement (this is the hard part to accomplish)

These concepts can also be described with precise mathematical statements, but this is a crash course for impatient devs so we won't get into that here. 

### ZKP Types

I'll describe zkp types with a hopefully useful analogy. In the field of machine learning or artificial intelligence, before
you can start doing anything, you have to choose a predictive techique to leverage, i.e. linear regression, boosted trees, deep neural nets, etc. 
Typically, you want to choose the simplist modeling method that is capable of attaining sufficient accuracy for your application.

You face a similar choice in zkp land as well. You need to choose an appropriate zkp *type* that satisfies the information constraints and requirements
of your problem. Different zkp types use completely different underlying mathematical formalisms to ensure the three properties discussed in [preliminaries and context](#preliminaries-and-context) are achieved. Some popular and actively researched zkp types include:

- Bulletproofs 
    - a zero-knowledge argument of knowledge that proves that a secret value lies within a given range 
    - typically used to prove that a committed value is greater than 0
- zkSTARKs 
    - stands for zero-knowledge scalable transparent argument of knowledge
    - doesn't require a trusted setup ceremony 
- zkSNARKs 
    - stands for zero-knowledge succinct non-interactive argument of knowledge
    - allows a prover to prove that they correctly performed a series of calculations defined by an algebraic cuicuit
    - requires a "trusted setup" ceremony

### zkSNARKs

This crash course will specifically focus on zkSNARKs, and more specifically zkSNARKS that leverage the *Groth16* proof system. There are
other proof systems with funny sounding names (like PLONK), but the Circom library we will be using is based on elliptic curve pairing theorems
as developed in the [Groth16 paper](https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=6d0e4b4d47afea119770b0386c94bcf277881a86). 

The lifecycle of a zkSNARK in practice is essentially this:

1. Define exactly the specific computation you need to carry out (like confirming that a leaf is a member of a Merkle tree). This requires determining what variables in your calculation make up your *witness* (in the literature, a witness is just a fancy name for the information you want to keep private). 
2. Write this computation as an algebraic circuit (we'll use circom language to do this)
3. Compile the circuit into a Rank 1 Constrain System (R1CS) which itself is converted (via the proof system) into a Quadratic Algebraic Program (QAP) and eventually a proving and verifying curcuit
4. Perform what is called a **trused setup ceremony** which itself has 2 phases, one of which is circuit dependent (see this [blog](https://medium.com/@VitalikButerin/zk-snarks-under-the-hood-b33151a013f6) from Vitalik Buterin to understand why we do this), to produce some *magic numbers* that are referred to in the literature as a *common reference string*. Constructing and verifing the proof in zero-knowledge hinges on the proper construction of the common reference string, so the trusted setup ceremony is a big deal for zkSTARK applications. 
5. Using your proving circuit from part 3 and your magic numbers created from the trusted setup ceremony in part 4, generate a proof that you faithfully carried out the calculations you defined in part 1. 
6. Using the verifying proof and the same magic numbers from part 4 that you used in part 5, verify the validity of the proof that was generated in part 5. 

> **Note**<br>
I encourage you to look further into R1CS and QAPs and the general mathematics of zkSNARKS. However, everything under the hood in zkSNARKs relies on algebraic manipulations of elliptic curves defined over finite fields. Unless you have a serious background in Galois theory and algebraic curves, you are unlikely to come up with your own novel (and secure) proof system for zkSNARKs. 

## Part 1: Setting up your Docker environment

This tutorial assumes you have Docker installed on your machine. The root folder of this repo contains a [Dockerfile](/Dockerfile)
that creates an environment with Rust (needed for the [Circom](https://github.com/iden3/circom) compiler) and Node (needed for [snarkjs](https://www.npmjs.com/package/snarkjs)). 

First, build a docker image called `circom`:
```
docker build -t circom .
```

Next, fire up an interactive environment with this new image:
```
docker run -it --rm --entrypoint bash -v /home/todd/code/circom-playground/:/root/circuits circom
```
> **Warning**<br>
The above command uses the `-v` flag to mount the repository into the container environment so you can edit your code without stopping, rebuilding, then 
restarting your container. Be sure to change `/home/todd/code/circom-playground` to the correct path on your machine or you won't see the files you need 
in the working directory.

Now you're all set up to start using Circom and snarkjs.

## Part 2: Compile a simple multiplication circuit

We're going to start with a boringly simple problem that [multiplies two numbers](/examples/multiplier2/multiplier2.circom) together and proves we did it right. If you wanted to do something like this in practice, you'd probably want to publish a hashed commitment of the two numbers your are multiplying together so that your proof is a little more usefull. That way the prover would know you multiplied the numbers that you committed to at a certain time stamp. But this first example is just to go through the motions. 

In order to compile the circuit, we need:
1. an input file in json format
2. the circom compiler (already built for you in the container environment)

```
cd /examples/multiplier2
circom multiplier2.circom --r1cs --wasm --sym --c
node ./multiplier2_js/generate_witness.js ./multiplier2_js/multiplier2.wasm input.json witness.wtns
```

The first command produced a [`.wasm`](https://webassembly.org/) file that can run in the browser (notice how we used a `node` runtime to 
compute the witness). The `.wasm` file is your compiled circuit and is used, along with an input file, to generate a witness file for your 
specific circuit.

So in practice you'd want to host the `.wasm` file somewhere such that anyone who wants to be a verifier can retrieve it so that they can compute a witness from their own private data. 

## Part 3: Perform the trusted setup ceremony

Now that your circuit is compiled, its time to generate the common reference string (aka, magic numbers). The first phase is often called the [Powers of Tau](https://medium.com/coinmonks/announcing-the-perpetual-powers-of-tau-ceremony-to-benefit-all-zk-snark-projects-c3da86af8377) and is only ever done once; it has no dependency on the computational graph of your circuit. 

```
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v # create CRS with all participants contributions
```

The second phase of depends on your specific circuit (not the input, but the computational graph). The quantity of magic numbers required to construct
a zkSNARK is proportional to the size of your circuit, so if you change the computation, you need to redo phase 2 of the trusted setup. 

```
snarkjs groth16 setup multiplier2.r1cs pot12_final.ptau multiplier2_0000.zkey # create a compatible key
snarkjs zkey contribute multiplier2_0000.zkey multiplier2_0001.zkey --name="1st Contributor Name" -v # use the key to contribute your own randomness
snarkjs zkey export verificationkey multiplier2_0001.zkey verification_key.json # export your key to a json file for later
```

In practice, if your application is using proving the same kind of statement over and over again with different private inputs (this will most likely be the case), then both phase I and II need only be done a single time before you officially launch your application into production. If you have a situation
where you don't know the circuits ahead of time, you'll need to run phase II once for each new circuit introduced. 



### Part 4: Generate a Proof

```
# your outputs here are proof.json and public.json
# they need to be communicated to the verifier 
snarkjs groth16 prove multiplier2_0001.zkey witness.wtns proof.json public.json
```

# Verify Proof (try changing something in proof.json so that the proof doesn't verify)
snarkjs groth16 verify verification_key.json public.json proof.json
```