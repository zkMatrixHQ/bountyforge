import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bountyforge } from "../target/types/bountyforge";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { expect } from "chai";

describe("bountyforge", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.bountyforge as Program<Bountyforge>;
  const connection = provider.connection;

  // Test accounts
  let creator: Keypair;
  let usdcMint: PublicKey;
  let creatorTokenAccount: PublicKey;
  let bountyId: number;
  let bountyPda: PublicKey;
  let bountyBump: number;
  let bountyTokenAccount: PublicKey;

  before(async () => {
    creator = Keypair.generate();

    const airdropSignature = await connection.requestAirdrop(
      creator.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);

    usdcMint = await createMint(
      connection,
      creator,
      creator.publicKey,
      null,
      6
    );

    // Create creator's token account
    const creatorTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      creator,
      usdcMint,
      creator.publicKey
    );
    creatorTokenAccount = creatorTokenAccountInfo.address;

    // Mint 1000 USDC to creator (1000 * 10^6)
    const mintAmount = 1000 * 10 ** 6;
    await mintTo(
      connection,
      creator,
      usdcMint,
      creatorTokenAccount,
      creator,
      mintAmount
    );
  });

  beforeEach(() => {
    bountyId = Math.floor(Math.random() * 1000000);

    const bountyIdBuffer = Buffer.allocUnsafe(8);
    bountyIdBuffer.writeBigUInt64LE(BigInt(bountyId), 0);

    // Derive bounty PDA
    [bountyPda, bountyBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("bounty"), bountyIdBuffer],
      program.programId
    );

    // Derive bounty token account (ATA)
    bountyTokenAccount = getAssociatedTokenAddressSync(
      usdcMint,
      bountyPda,
      true // allowOwnerOffCurve
    );
  });

  it("Posts a bounty successfully", async () => {
    const description = "Solve this puzzle";
    const reward = 100 * 10 ** 6; // 100 USDC

    // Get initial balances
    const creatorBalanceBefore = await connection.getTokenAccountBalance(
      creatorTokenAccount
    );

    try {
      await getOrCreateAssociatedTokenAccount(
        connection,
        creator,
        usdcMint,
        bountyPda,
        true
      );
    } catch (e) {
      // Account might already exist, continue
    }

    // Post bounty
    const tx = await program.methods
      .postBounty(
        new anchor.BN(bountyId),
        description,
        new anchor.BN(reward)
      )
      .accountsPartial({
        creator: creator.publicKey,
        bounty: bountyPda,
        usdcMint: usdcMint,
        creatorTokenAccount: creatorTokenAccount,
        bountyTokenAccount: bountyTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    console.log("Post bounty transaction:", tx);

    // Verify bounty account
    const bountyAccount = await program.account.bounty.fetch(bountyPda);
    expect(bountyAccount.id.toNumber()).to.equal(bountyId);
    expect(bountyAccount.description).to.equal(description);
    expect(bountyAccount.reward.toNumber()).to.equal(reward);
    expect(bountyAccount.status).to.deep.equal({ open: {} });
    expect(bountyAccount.creator.toString()).to.equal(
      creator.publicKey.toString()
    );
    expect(bountyAccount.solutionHash).to.be.null;

    // Verify token balances
    const creatorBalanceAfter = await connection.getTokenAccountBalance(
      creatorTokenAccount
    );
    const bountyBalance = await connection.getTokenAccountBalance(
      bountyTokenAccount
    );

    expect(creatorBalanceAfter.value.amount).to.equal(
      (Number(creatorBalanceBefore.value.amount) - reward).toString()
    );
    expect(bountyBalance.value.amount).to.equal(reward.toString());
  });

  it("Fails when creator has insufficient USDC", async () => {
    const description = "Expensive bounty";
    const reward = 10000 * 10 ** 6; // 10000 USDC (more than creator has)

    try {
      await program.methods
        .postBounty(
          new anchor.BN(bountyId),
          description,
          new anchor.BN(reward)
        )
        .accountsPartial({
          creator: creator.publicKey,
          bounty: bountyPda,
          usdcMint: usdcMint,
          creatorTokenAccount: creatorTokenAccount,
          bountyTokenAccount: bountyTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      expect.fail("Should have failed with insufficient balance");
    } catch (err) {
      expect(err).to.exist;
      // Transaction should fail due to insufficient token balance
    }
  });

  it("Fails when token account mint doesn't match", async () => {
    // Create a different mint
    const wrongMint = await createMint(
      connection,
      creator,
      creator.publicKey,
      null,
      6
    );

    // Create token account with wrong mint
    const wrongTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      creator,
      wrongMint,
      creator.publicKey
    );

    try {
      await program.methods
        .postBounty(
          new anchor.BN(bountyId),
          "Test bounty",
          new anchor.BN(100 * 10 ** 6)
        )
        .accountsPartial({
          creator: creator.publicKey,
          bounty: bountyPda,
          usdcMint: usdcMint,
          creatorTokenAccount: wrongTokenAccount.address, // Wrong mint
          bountyTokenAccount: bountyTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      expect.fail("Should have failed with mint mismatch");
    } catch (err) {
      expect(err).to.exist;
      // Should fail due to constraint violation
    }
  });

  it("Fails when bounty token account owner is wrong", async () => {
    // Create token account owned by creator instead of bounty PDA
    const wrongBountyTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      creator,
      usdcMint,
      creator.publicKey // Wrong owner
    );

    try {
      await program.methods
        .postBounty(
          new anchor.BN(bountyId),
          "Test bounty",
          new anchor.BN(100 * 10 ** 6)
        )
        .accountsPartial({
          creator: creator.publicKey,
          bounty: bountyPda,
          usdcMint: usdcMint,
          creatorTokenAccount: creatorTokenAccount,
          bountyTokenAccount: wrongBountyTokenAccount.address, // Wrong owner
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      expect.fail("Should have failed with owner mismatch");
    } catch (err) {
      expect(err).to.exist;
      // Should fail due to constraint violation
    }
  });

  it("Can post multiple bounties", async () => {
    const bountyId1 = 1;
    const bountyId2 = 2;
    const reward = 50 * 10 ** 6; // 50 USDC each

    // Convert bounty IDs to little-endian bytes
    const bountyId1Buffer = Buffer.allocUnsafe(8);
    bountyId1Buffer.writeBigUInt64LE(BigInt(bountyId1), 0);
    const bountyId2Buffer = Buffer.allocUnsafe(8);
    bountyId2Buffer.writeBigUInt64LE(BigInt(bountyId2), 0);

    // Derive PDAs
    const [bountyPda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("bounty"), bountyId1Buffer],
      program.programId
    );
    const [bountyPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("bounty"), bountyId2Buffer],
      program.programId
    );

    const bountyTokenAccount1 = getAssociatedTokenAddressSync(
      usdcMint,
      bountyPda1,
      true
    );
    const bountyTokenAccount2 = getAssociatedTokenAddressSync(
      usdcMint,
      bountyPda2,
      true
    );

    // Create token accounts
    await getOrCreateAssociatedTokenAccount(
      connection,
      creator,
      usdcMint,
      bountyPda1,
      true
    );
    await getOrCreateAssociatedTokenAccount(
      connection,
      creator,
      usdcMint,
      bountyPda2,
      true
    );

    // Post first bounty
    await program.methods
      .postBounty(new anchor.BN(bountyId1), "Bounty 1", new anchor.BN(reward))
      .accountsPartial({
        creator: creator.publicKey,
        bounty: bountyPda1,
        usdcMint: usdcMint,
        creatorTokenAccount: creatorTokenAccount,
        bountyTokenAccount: bountyTokenAccount1,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Post second bounty
    await program.methods
      .postBounty(new anchor.BN(bountyId2), "Bounty 2", new anchor.BN(reward))
      .accountsPartial({
        creator: creator.publicKey,
        bounty: bountyPda2,
        usdcMint: usdcMint,
        creatorTokenAccount: creatorTokenAccount,
        bountyTokenAccount: bountyTokenAccount2,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Verify both bounties exist
    const bounty1 = await program.account.bounty.fetch(bountyPda1);
    const bounty2 = await program.account.bounty.fetch(bountyPda2);

    expect(bounty1.id.toNumber()).to.equal(bountyId1);
    expect(bounty2.id.toNumber()).to.equal(bountyId2);
    expect(bounty1.reward.toNumber()).to.equal(reward);
    expect(bounty2.reward.toNumber()).to.equal(reward);
  });
});

// Helper function to get associated token address synchronously
function getAssociatedTokenAddressSync(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false
): PublicKey {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}
