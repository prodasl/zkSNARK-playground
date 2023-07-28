# Practical crash course in zkSNARKS for devs in hurry

I'm making this repo to serve as a teaching aid for a crash course to practical usage of zkSNARKS for developers in a hurry. 
Specifically, I'm basing the tutorial off of the [circom](https://github.com/iden3/circom) zkp circuit compiler and the 
[snarkjs](https://github.com/iden3/snarkjs) proving/verifying library. The repository comes with a 
Dockerfile that is fully self-contained with all dependencies necessary to perform the numerical experiments discussed here.  

## Preliminaries and Context

Zero-knowledge proofs (zkp's) allow a "prover" to convince a "verifier" that a statement is true without letting the cat out of the bag as 
to why the statement is true. The first thing to remember is that in a zkp setting, there is **always** a *prover* and a *verifier*. If you are 
trying to leverage zkps in your application, you must identify the user persona's that fall under these categories (example: if you're using zkp's for
authentication, then the end user is the prover and the backend of your app is the verifier). 

Zero-knowledge proofs (much like the field of machine learning), are not a monolithic concept or single algorithm where one method works
for all use cases. ZKP's form a heterogeneous technology landscape with a large variety of algorithmic techniques and mathematical formalisms 
that each have different tradeoffs with some techniques being more appropriate than others for particular situations. Some zkps are interactive, 
others non-interactive (you'll see them referred to as NIZK), others have the property of succinctness (meaning proof sizes are small relative the 
calculation your are proving a statement about), some are specifically designed for proving particular statements, etc. It can be difficult 
to know what zkp mechanism to use and when. 

Regardless of the particular zkp you end up using in your application, all (useful) zkps must have the following properties:

1. *Completeness* - If the verifier is being honest, then the prover can convince them beyond a shadow of a doubt that a true statement is indeed true
2. *Soundness* - If a statement is false, a malicous prover cannot trick a verifier into thinking it is true
3. *Zero-Knowledge* - a verifier learns nothing other than the truthyness of a statement (this is the hard part to accomplish)

These properties can also be articulated as precise mathematical statements, but this is a crash course for impatient devs so we won't get 
into that here. 

### ZKP Types

I'll describe zkp types with a hopefully useful analogy. In the field of machine learning or artificial intelligence, before
you can start doing anything, you have to choose a predictive techique to leverage, i.e. linear regression, boosted trees, deep neural nets, etc. 
Typically, you want to choose the simplist modeling method that is capable of attaining sufficient predictive accuracy for your application.

You face a similar choice in zkp land as well. You need to choose an appropriate zkp *type* that satisfies the information constraints and requirements
of your problem. Different zkp types use completely different underlying mathematical formalisms to ensure the three properties discussed in [preliminaries and context](#preliminaries-and-context) are achieved. Some popular zkp types that are actually used in production systems include:

- Bulletproofs 
    - a zero-knowledge argument of knowledge that proves that a secret value lies within a given range 
    - typically used to prove that a committed value is greater than 0
- zkSTARKs 
    - stands for zero-knowledge scalable transparent argument of knowledge
    - doesn't require a trusted setup ceremony 
    - proof sizes are proportional to the size of the computational circuit
- zkSNARKs (what we're doing here)
    - stands for zero-knowledge succinct non-interactive argument of knowledge
    - allows a prover to prove that they correctly performed a series of calculations defined by an algebraic cuicuit
    - requires a "trusted setup" ceremony
    - proofs sizes are decoupled from the size of the computational circuit (thus the succinct discriptor)

There are many other types (like ring signatures) but that is enough for our purposes.

### zkSNARKs

This crash course will focus on zkSNARKs, and more specifically zkSNARKS that leverage the *Groth16* proof system. There are
other proof systems for zkSNARKs with funny sounding names (like PLONK, and FFLONK), but the Circom examples we will be working through will utilize 
the elliptic curve pairing theorems as developed in the [Groth16 paper](https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=6d0e4b4d47afea119770b0386c94bcf277881a86). 

The lifecycle of a zkSNARK app in practice is something like this:

1. Define exactly the specific computation you need to carry out (like confirming that a leaf is a member of a Merkle tree). This requires determining what variables in your calculation make up your *witness* (in the zk literature, a witness is just a fancy name for the information you want to keep private). If one of your inputs to your circuit is a secret, its part of your witness set. You must also determine what (if any) public inputs feed into your computation (like the root node of a Merkle tree or some other kind of public committment thats easily accessible by all parties). 
2. Write this computation as an algebraic circuit (we'll use [circom language](https://docs.circom.io/circom-language/signals/) to do this). This actually isn't too hard but it's not trivial either (at least for interesting usecases). 
3. Compile the circuit into a [Rank 1 Constraint System](https://www.zeroknowledgeblog.com/index.php/the-pinocchio-protocol/r1cs) (R1CS) which itself is converted (via the proof system) into a [Quadratic Algebraic Program](https://www.zeroknowledgeblog.com/index.php/the-pinocchio-protocol/qap) (QAP) and eventually a proving and verifying curcuit.
4. Perform what is called a **trused setup ceremony** (you'll also see if called the Powers of Tau) to produce some *magic numbers* that are referred to in the literature as a *common reference string* (see this [blog](https://medium.com/@VitalikButerin/zk-snarks-under-the-hood-b33151a013f6) from Vitalik Buterin to understand why we do this). The common reference string is public information and is used to contruct a proof key and a verification key (also public information) that are used by any participants in your zkSNARK app. The Groth16 proof system we will be using requires 2 phases to the trusted setup, one phase that is completely independent of any particular circuit, and another phase that specifically depends on the circuit you develped and compiled in parts 1-3 earlier. Constructing and verifing the proof in zero-knowledge hinges on the proper construction of the common reference string and the disposal of its associated [*toxic waste*](https://zkproof.org/2021/06/30/setup-ceremonies/#:~:text=Second%2C%20zkSNARKs%20rely,forge%20fraudulent%20proofs.), so the trusted setup ceremony is a big deal for zkSTARK applications. If this *toxic waste* isn't disposed of properly, fraudulent proofs can be created (this is why multi-party compute protocols have been developed for trusted ceremonies to mitigate this risk). 
5. As the prover, using your compiled circuit, public inputs, the witness from parts 2 and 3, and the application's proving key from the trusted setup ceremony in part 4, generate a proof that you faithfully carried out the calculations you defined in part 1. Send the proof to the verifier through an appropriate channel. 
6. As the verifier, using the verification key from part 4 and the public inputs to the computation defined in part 1, verify the validity of the proof that was generated in part 5.

Technically the trusted setup ceremony could be done first (at least phase 1 could), and in fact, you can pull the Powers of Tau artifacts from 
previous successfull ceremonies from online sources like https://www.trusted-setup-pse.org. Just make sure the artifacts are compatible with 
the circuit library you're using in your application.

> **Note**<br>
As stated in part 4, the Groth16 proof system has a two phase trusted setup, with the second stage being circuit dependent. Other proof systems like
PLONK and FFLONK do not require this second phase. So why are we making our life harder? This is because Groth16 is substantially more computationally
efficient for creating and verifying proofs once you've completed the trusted setup. If your application is using the same circuit over and over again
(which it probably will), then Groth16 is your best option for a proof sytem at the moment, particularly if proofs need to be generated on a mobile device or in the browser. 

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

this will start a bash terminal in the docker environment. 

> **Warning**<br>
The above command uses the `-v` flag to mount the repository into the container environment so you can edit your code without stopping, rebuilding, then 
restarting your container. Be sure to change `/home/todd/code/circom-playground` to the correct path on your machine or you won't see the files you need 
in the working directory.

Now you're all set up to start using Circom and snarkjs.

## Part 2: Compile a simple multiplication circuit

We're going to start with a boringly simple problem that [multiplies two numbers](/examples/multiplier2/multiplier2.circom) together and proves we did it right. If you wanted to do something like this in practice, you'd probably want to publish a hashed commitment of the two numbers your are multiplying together so that your proof is a little more usefull. That way the prover would know you multiplied the numbers that you committed to at a certain time stamp. But this first example is just to go through the motions. 

In order to compile the circuit, we need:
1. an input file in json format that contains all the input data (both public and private) that your calculation requires
2. the circom compiler (already built for you in the container environment)

```
cd /examples/multiplier2
# compile the circuit into R1CS and output wasm executable needed to compute your witness later
# output some debugging symbols you can use to explore the R1CS file
circom multiplier2.circom --r1cs --wasm --sym 
```

The compilation command produced a [`.wasm`](https://webassembly.org/) file that can run in the browser (notice how we used a `node` runtime to 
compute the witness). The `.wasm` file is your fully compiled circuit and is used, along with an variable input file, to generate a witness file for your 
specific circuit.

So, in practice the `.wasm` file will be a dependency of your client-side application. It will run on your end user's device and it will be called
every time a proof needs to be generated (which could be often). 

## Part 3: Perform the trusted setup ceremony

Now that your circuit is compiled and you have it in the form of a R1CS, its time to generate the common reference string (aka, magic numbers). 
The first phase is often called the [Powers of Tau](https://medium.com/coinmonks/announcing-the-perpetual-powers-of-tau-ceremony-to-benefit-all-zk-snark-projects-c3da86af8377) and is only ever done once; it has no dependency on the computational graph of your circuit. 

```
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v # create CRS with all participants contributions
```

The second phase of depends on your specific circuit, specifically its R1CS. The quantity of magic numbers required to construct
a zkSNARK is proportional to the size of your circuit, so if you change the computation, you need to redo phase 2 of the trusted setup. 

```
snarkjs groth16 setup multiplier2.r1cs pot12_final.ptau multiplier2_0000.zkey # create a compatible key
snarkjs zkey contribute multiplier2_0000.zkey multiplier2_0001.zkey --name="1st Contributor Name" -v # use the key to contribute your own randomness
snarkjs zkey export verificationkey multiplier2_0001.zkey verification_key.json # export your key to a json file for later
```

In practice, if your application is using proving the same kind of statement over and over again with different private inputs (this will most likely be the case), then both phase I and II need only be done a single time before you officially launch your application into production. If you have a situation
where you don't know the circuits ahead of time, you'll need to run phase II once for each new circuit introduced. 

### Part 4: Generate a Proof

Now that we have compiled our circuit and successfully completed the trusted setup ceremony, a prover has everything it needs to start generating proofs.

First, use the `.wasm` file you compiled along with an input file containing all the public and private inputs to output a special witness file. 

Then, use the publicly available proving key from the trusted setup along with the witness to output a json file containing your proof as well 
as a separate file that contains just the public information that the verifier will need. 

```
# this first step will compute a special binary-format witness file
node ./multiplier2_js/generate_witness.js ./multiplier2_js/multiplier2.wasm input.json witness.wtns # run the compiled circuit against your input
# your outputs here are proof.json and public.json
# they need to be communicated to the verifier 
snarkjs groth16 prove multiplier2_0001.zkey witness.wtns proof.json public.json
```

# Part 5: Verify the Proof

Now that the proof and public inputs have been delivered to the verifier, use the publicly available verification key to verify their contents:

```
snarkjs groth16 verify verification_key.json public.json proof.json
```

Proofs generated for zkSNARKS can also be verified on smart contract platforms like Ethereum. The Ethereum Virtual Machine introduced special routines
(EIP196 and EIP197) in an attempt to make zkSNARK proof verification as efficient (and thus cheap) as possible. This is what makes token mixers like
Tornado Cash feasible to implement and use on the Etheruem blockchain.

> **Note**<br>
Try changing something small in proof.json file so that the proof doesn't verify.