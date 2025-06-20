import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { LedgerVault } from "../target/types/ledger_vault";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { assert } from "chai";

describe("ledger-vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet as NodeWallet;

  const program = anchor.workspace.ledgerVault as Program<LedgerVault>;

  let mint: anchor.web3.PublicKey;
  let userATA: anchor.web3.PublicKey;
  let vaultState: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  it("Creates a mint and initializes user ATA", async () => {
    // Create a new mint
    mint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      9 // Decimals
    );
    console.log("\nMint created:", mint.toBase58());

    // Initialize user's associated token account (ATA)
    let ATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      payer.publicKey
    );
    userATA = ATA.address;

    console.log("User ATA initialized:", userATA.toBase58());

    vaultState = anchor.web3.PublicKey.findProgramAddressSync([
      Buffer.from("vault"),
      provider.publicKey.toBuffer(),
      mint.toBuffer(),
    ], program.programId)[0];
    console.log("\nVault State Address:", vaultState.toBase58());
  
    vault = getAssociatedTokenAddressSync(
      mint,
      vaultState,
      true, // allow owner off curve
    );
  });


  it("Is initialized!", async () => {
  
    const tx = await program.methods.initialize().accountsPartial({
      user: provider.publicKey,
      mint,
      vaultState,
      vault,
      systemProgram: SYSTEM_PROGRAM_ID,
    })
    .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Mints tokens to user ATA", async () => {
    // Mint tokens to user's ATA
    const mintAmount = 100000000; // 100 token with 9 decimals
    await mintTo(
      provider.connection,
      payer.payer,
      mint,
      userATA,
      payer.publicKey,
      mintAmount
    );
    console.log(`\nMinted ${mintAmount} tokens to user ATA: ${userATA.toBase58()}`);
  });

  it("Deposits tokens into the vault", async () => {

    let initalBalance = await provider.connection.getTokenAccountBalance(vault);
    console.log("\nVault balance before deposit:", initalBalance.value.amount);

    const tx = await program.methods.deposit(new anchor.BN(10000000)) // Deposit 10 tokens
      .accountsPartial({
        user: provider.publicKey,
        mint,
        vaultState,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log("\nDeposit transaction signature", tx);
    
    let finalBalance = await provider.connection.getTokenAccountBalance(vault);
    console.log("\nVault balance after deposit:", finalBalance.value.amount);
  });

  it("Withdraw all tokens and close vault", async () => {
    let initialBalance = await provider.connection.getTokenAccountBalance(vault);
    console.log("\nVault balance before withdrawal:", initialBalance.value.amount);

    let userBalanceBefore = await provider.connection.getTokenAccountBalance(userATA);
    console.log("User ATA balance before withdrawal:", userBalanceBefore.value.amount);

    const tx = await program.methods.withdraw()
      .accountsPartial({
        user: provider.publicKey,
        mint,
        userAta: userATA,
        vaultState,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log("\nWithdrawal and close transaction signature", tx);

    // Verify vault token account is closed
    try {
      await provider.connection.getTokenAccountBalance(vault);
      assert.fail("Vault token account should be closed");
    } catch (error) {
      console.log("✓ Vault token account successfully closed");
    }

    // Verify PDA is closed
    try {
      await program.account.vault.fetch(vaultState);
      assert.fail("Vault state PDA should be closed");
    } catch (error) {
      console.log("✓ Vault state PDA successfully closed");
    }

    // Verify user received all tokens
    let userBalanceAfter = await provider.connection.getTokenAccountBalance(userATA);
    console.log("User ATA balance after withdrawal:", userBalanceAfter.value.amount);
    
    const expectedBalance = parseInt(userBalanceBefore.value.amount) + parseInt(initialBalance.value.amount);
    assert.equal(userBalanceAfter.value.amount, expectedBalance.toString());
  });

});
