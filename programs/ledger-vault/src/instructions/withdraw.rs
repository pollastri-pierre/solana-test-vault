use anchor_lang::prelude::*;
use anchor_spl::token::{
    Mint, 
    Token, 
    TokenAccount,
    Transfer,
    CloseAccount,
    close_account,
    transfer,
};

use crate::state::Vault;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = user_ata.owner == user.key(),
        constraint = user_ata.mint == mint.key(),
    )]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref(), mint.key().as_ref()],
        bump = vault_state.vault_bump,
        close = user // Close the PDA and return rent to user
    )]
    pub vault_state: Account<'info, Vault>,
    #[account(
        mut,
        constraint = vault.owner == vault_state.key(),
        constraint = vault.mint == mint.key(),
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self) -> Result<()> {
        let vault_balance = self.vault.amount;
        
        if vault_balance > 0 {
            let user_key = self.user.key();
            let mint_key = self.mint.key();
            let bump = self.vault_state.vault_bump;
            
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"vault",
                user_key.as_ref(),
                mint_key.as_ref(),
                &[bump],
            ]];

            transfer(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    Transfer {
                        from: self.vault.to_account_info(),
                        to: self.user_ata.to_account_info(),
                        authority: self.vault_state.to_account_info(),
                    },
                    signer_seeds,
                ),
                vault_balance,
            )?;
        }
        self.close_account()?;

        Ok(())
    }

    pub fn close_account(&mut self) -> Result<()> {
        let user_key = self.user.key();
        let mint_key = self.mint.key();
        let bump = self.vault_state.vault_bump;

        close_account(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                CloseAccount {
                    account: self.vault.to_account_info(),
                    destination: self.user.to_account_info(),
                    authority: self.vault_state.to_account_info(),
                },
                &[&[
                    b"vault",
                    user_key.as_ref(),
                    mint_key.as_ref(),
                    &[bump],
                ]],
            ),
        )?;

        Ok(())
    }
}