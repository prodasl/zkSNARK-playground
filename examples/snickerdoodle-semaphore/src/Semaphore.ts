import {
  Circuit,
  circuitMain,
  public_,
  Poseidon,
  Field,
  MerkleTree,
  MerkleWitness,
  Struct,
} from 'snarkyjs';

export class MyMerkleWitness extends MerkleWitness(16) {};

export class Identity extends Struct({
  identityTrapdoor: Field,
  identityNullifier: Field,
}) {
  // we have to hash this stuff twice for the semaphore protocol
  secret(): Field {
    return Poseidon.hash([this.identityTrapdoor, this.identityNullifier]);
  }

  leaf(): Field {
    return Poseidon.hash([this.secret()]);
  }
}

export class Semaphore_Circuit extends Circuit {
  @circuitMain
  static main(@public_ merkleRoot: Field, 
              @public_ epochNullifier: Field, 
              @public_ signalNullifier: Field, 
              @public_ signalHash: Field,
              @public_ signalHashSquared: Field,
              identity: Identity, 
              path: MyMerkleWitness) {

    // we check that the identity is contained in the committed Merkle Tree
    path.calculateRoot(identity.leaf()).assertEquals(merkleRoot);

    // now we check that the signalNullifier was computed properly to prevent double tapping (order matters)
    Poseidon.hash([identity.identityNullifier, epochNullifier]).assertEquals(signalNullifier);

    // check that the communicated signal has not been tampered with
    signalHash.mul(signalHash).assertEquals(signalHashSquared);
  }
}
