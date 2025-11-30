import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bountyforge } from "../target/types/bountyforge";
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

function deriveBountyPda(programId: PublicKey, bountyId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("bounty"), new anchor.BN(bountyId).toBuffer("le", 8)],
        programId
    );
}

async function postBounty(
    program: Program<Bountyforge>,
    connection: anchor.web3.Connection,
    creator: Keypair,
    usdcMint: PublicKey,
    creatorTokenAccount: PublicKey,
    bountyId: number,
    bountyType: any,
    description: string,
    reward: number
): Promise<void> {
    const [bountyPda] = deriveBountyPda(program.programId, bountyId);
    
    if (await connection.getAccountInfo(bountyPda)) {
        console.log(`Bounty #${bountyId} exists, skipping`);
        return;
    }

    const bountyTokenAccount = getAssociatedTokenAddressSync(usdcMint, bountyPda, true);
    const instructions = [];

    if (!await connection.getAccountInfo(bountyTokenAccount)) {
        instructions.push(
            createAssociatedTokenAccountInstruction(
                creator.publicKey,
                bountyTokenAccount,
                bountyPda,
                usdcMint,
                TOKEN_PROGRAM_ID,
                new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
            )
        );
    }

    const tx = await program.methods
        .postBounty(new anchor.BN(bountyId), bountyType, description, new anchor.BN(reward))
        .accountsStrict({
            creator: creator.publicKey,
            bounty: bountyPda,
            usdcMint,
            creatorTokenAccount,
            bountyTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
            systemProgram: SystemProgram.programId,
        })
        .preInstructions(instructions)
        .signers([creator])
        .rpc();

    console.log(`✓ Bounty #${bountyId}: ${tx.slice(0, 8)}...`);
}

async function main() {
    const connection = new anchor.web3.Connection(
        process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com",
        "confirmed"
    );

    const walletPath = process.env.ANCHOR_WALLET || 
        path.join(process.env.HOME || process.env.USERPROFILE || "", ".config/solana/id.json");

    if (!fs.existsSync(walletPath)) {
        console.error("Wallet not found");
        process.exit(1);
    }

    const creator = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
    );

    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(creator),
        { commitment: "confirmed" }
    );

    const idl = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "target/idl/bountyforge.json"), "utf-8")
    );
    const program = new Program<Bountyforge>(
        idl as Bountyforge,
        provider,
    );

    const usdcMint = new PublicKey(process.env.USDC_MINT || "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    const creatorTokenAccount = (await getOrCreateAssociatedTokenAccount(
        connection,
        creator,
        usdcMint,
        creator.publicKey
    )).address;

    const balance = Number(
        (await connection.getTokenAccountBalance(creatorTokenAccount)).value.amount
    ) / 1e6;

    if (balance < 5) {
        console.error(`Insufficient balance: ${balance} USDC (need 5)`);
        process.exit(1);
    }

    const bounties = [
        {
            id: 100,
            type: { walletIntelligence: {} },
            desc: "Analyze wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU - determine if it's smart money",
            reward: 1e6,
        },
        {
            id: 101,
            type: { walletIntelligence: {} },
            desc: "Analyze wallet 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM - check PnL and status",
            reward: 2e6,
        },
        {
            id: 102,
            type: { tokenScreening: {} },
            desc: "Screen Solana tokens: >$100k volume, >10% holder growth",
            reward: 1.5e6,
        },
    ];

    for (const b of bounties) {
        await postBounty(program, connection, creator, usdcMint, creatorTokenAccount, b.id, b.type, b.desc, b.reward);
    }

    console.log("Done");
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});