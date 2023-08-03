# Practical crash course in zkSNARKS for devs in hurry

I'm making this repo to serve as a teaching aid for a crash course to practical usage of zkSNARKS for developers in a hurry. 
Specifically, I'm basing the tutorial off of the [circom](https://github.com/iden3/circom) zkp circuit compiler and the 
[snarkjs](https://github.com/iden3/snarkjs) proving/verifying library. The repository comes with a 
Dockerfile that is fully self-contained with all dependencies necessary to perform the numerical experiments discussed here.  

## Preliminaries and Context

Zero-knowledge proofs (zkp's) allow a "prover" to convince a "verifier" that a statement is true without letting the cat out of the bag as 
to why the statement is true. The first thing to remember is that in a zkp setting, there is **always** a *prover* and a *verifier*. If you are 
trying to leverage zkps in your product or application, you must identify which user persona or actor falls under which category (example: if you're using zkp's for
authentication, then the end user is the prover and the backend of your app is the verifier). 

Zero-knowledge proofs (much like the field of machine learning), are not a monolithic concept or single algorithm where one method works
for all use cases. ZKP's form a heterogeneous technology landscape with a large variety of algorithmic techniques and mathematical formalisms 
that each have different tradeoffs with some techniques being more appropriate than others for particular situations. Some zkps are interactive, 
others non-interactive (you'll see them referred to as NIZK), others have the property of succinctness (meaning proof sizes are small relative the 
calculation your are proving a statement about), some are specifically designed for proving particular statements, etc. It can be difficult 
to know what zkp mechanism to use and when. 

Regardless of the particular zkp you end up using in your application, all (useful) zkps must have the following properties:

1. *Completeness* - If the verifier is being honest, then the prover can convince them beyond a shadow of a doubt that a true statement is indeed true
2. *Soundness* - If a statement is false, a malicious prover cannot trick a verifier into thinking it is true
3. *Zero-Knowledge* - a verifier learns nothing other than the truthyness of a statement (this is the hard part to accomplish)

These properties can also be articulated as precise mathematical statements, but this is a crash course for impatient devs so we won't get 
into that here. 

### ZKP Types

I'll describe zkp types with a hopefully useful analogy. In the field of machine learning or artificial intelligence, before
you can start doing anything, you have to choose a predictive technique to leverage, i.e. linear regression, boosted trees, deep neural nets, etc. 
Typically, you want to choose the simplest modeling method that is capable of attaining sufficient predictive accuracy for your application.

You face a similar choice in zkp land as well. You need to choose an appropriate zkp *type* that satisfies the information constraints and requirements
of your problem. Different zkp types use completely different underlying mathematical formalisms to ensure the three properties discussed in [preliminaries and context](#preliminaries-and-context) are achieved. Some popular zkp types that are actually used in production systems include:

- [Bulletproofs ](https://eprint.iacr.org/2017/1066.pdf)
    - a zero-knowledge argument of knowledge that proves that a secret value lies within a given range 
    - typically used to prove that a committed value is greater than 0
- [zkSTARKs](https://starkware.co/wp-content/uploads/2022/05/STARK-paper.pdf)
    - stands for zero-knowledge scalable transparent argument of knowledge
    - allows a prover to prove that they correctly performed a series of calculations defined by an algebraic circuit
    - doesn't require a trusted setup ceremony 
    - security model is based on 1-way hashing functions (not elliptic curves over finite fields, thus quantum resistance)
    - proofs sizes are decoupled from the size of the computational circuit (thus the scalable descriptor)
    - very new technology, not yet mature enough for widespread production applications
- [zkSNARKs](https://eprint.iacr.org/2011/443.pdf) (what we're doing here)
    - stands for zero-knowledge succinct non-interactive argument of knowledge
    - allows a prover to prove that they correctly performed a series of calculations defined by an algebraic/arithmetic circuit
    - requires a "trusted setup" ceremony (page 1, 3rd paragraph of the linked paper)
    - security model is based on discrete logarithm of elliptic curves (thus **not** quantum resistant)
    - proofs sizes are decoupled from the size of the computational circuit (thus the succinct descriptor)
    - fairly mature technology with lots of software implementations and production deployments 

There are many other types (like ring signatures) but that is enough for our purposes.

### zkSNARKs

This crash course will focus on zkSNARKs, and more specifically zkSNARKS that leverage the *Groth16* proof system. There are
other proof systems for zkSNARKs with funny sounding names (like PLONK, and FFLONK), but the Circom examples we will be working through will utilize 
the elliptic curve pairing theorems as developed in the [Groth16 paper](https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=6d0e4b4d47afea119770b0386c94bcf277881a86). 

The lifecycle of a zkSNARK app in practice is something like this:

1. Define exactly the specific computation you need to carry out (like confirming that a leaf is a member of a Merkle tree). This requires determining what variables in your calculation make up your *witness* (in the zk literature, a witness is just a fancy name for the information you want to keep private). If one of your inputs to your circuit needs to be kept a secret, its part of your witness set. You must also determine what public quantities are associated with your computation (like the root node of a Merkle tree or some other kind of public commitment thats easily accessible by all parties). 
2. Write this computation as an algebraic circuit (we'll use [circom language](https://docs.circom.io/circom-language/signals/) to do this). This actually isn't too hard but it's not trivial either (at least for interesting use cases). 
3. Compile the circuit into a [Rank 1 Constraint System](https://www.zeroknowledgeblog.com/index.php/the-pinocchio-protocol/r1cs) (R1CS) and associated [Quadratic Algebraic Program](https://www.zeroknowledgeblog.com/index.php/the-pinocchio-protocol/qap) (QAP) which are needed to create your proofs.
4. Perform what is called a **trusted setup ceremony** (you'll also see if called the Powers of Tau) to produce some *magic numbers* that are referred to in the literature as a *common reference string* (see this [blog](https://medium.com/@VitalikButerin/zk-snarks-under-the-hood-b33151a013f6) from Vitalik Buterin to understand why we do this). The common reference string is public information and is used to construct a proof key and a verification key (also public information) that are used by any participants in your zkSNARK app. The Groth16 proof system we will be using requires 2 phases to the trusted setup, one phase that is completely independent of any particular circuit, and another phase that specifically depends on the circuit you developed and compiled in parts 1-3 earlier. Constructing and verifying the proof in zero-knowledge hinges on the proper construction of the common reference string and the disposal of its associated [*toxic waste*](https://zkproof.org/2021/06/30/setup-ceremonies/#:~:text=Second%2C%20zkSNARKs%20rely,forge%20fraudulent%20proofs.), so the trusted setup ceremony is a big deal for zkSTARK applications. If this *toxic waste* isn't disposed of properly, fraudulent proofs can be created (this is why multi-party compute protocols have been developed for trusted ceremonies to mitigate this risk). 
5. As the prover, using your compiled circuit, public and private inputs defined in part 1, and the application's proving key from the trusted setup ceremony in part 4, generate a proof that you faithfully carried out the calculations you defined in part 1. Send the proof to the verifier through an appropriate channel. 
6. As the verifier, using the verification key from part 4 and the public inputs to the computation defined in part 1, verify the validity of the proof that was generated in part 5.

Technically the trusted setup ceremony could be done first (at least phase 1 could), and in fact, you can pull the Powers of Tau artifacts from 
previous successful ceremonies from online sources like https://www.trusted-setup-pse.org. Just make sure the artifacts are compatible with 
the circuit library you're using in your application.

> **Note**<br>
As stated in part 4, the Groth16 proof system has a two phase trusted setup, with the second stage being circuit dependent. Other proof systems like
PLONK and FFLONK do not require this second phase. So why are we making our life harder? This is because Groth16 is substantially more computationally
efficient for creating and verifying proofs once you've completed the trusted setup. If your application is using the same circuit over and over again
(which it probably will), then Groth16 is your best option for a proof sytem at the moment, particularly if proofs need to be generated on a mobile device or in the browser. 

### A Key Take Away for zkSNARKs

Something you need to make sure you understand about zkSNARKs as someone who is trying to use them for engineering or product purposes is that they essentially represent a programming model. If you can wrap your head around this programming model, you can effectively leverage zkSNARKs in practical applications. What I mean by this is that a zkSNARK requires that a computation be written as an algebraic/boolean circuit (think computational graph) in order for a zk proof to be algorithmically generated. 

If you come from a deep learning background, you should be familiar with automatic differentiation (AD). AD enables **exact** derivatives to be computed of any function implemented in code on a digital computer. How? Because any mathematical approximation written on a digital computer must be composed of elementary operations (i.e. +, -, *, /, **) and taking the derivative of a function composed of these operations merely requires repeated application of the chain rule to simple functions with analytic derivatives. 

A similar concept is at play here with zkSNARKs. Many useful computations can be expressed as a graph of elementary operations (in this case +, *, and boolean operations) applied to elements of a (really big) finite field (as an aside, you should understand that regular old division that you perform with real or rational numbers doesn't exist in finite fields). Statements created with these operators can be algorithmically turned into polynomial relations with homomorphic encryption properties. If you can figure out how to write your problem as an algebraic/boolean circuit, then you have a zkSNARK. 