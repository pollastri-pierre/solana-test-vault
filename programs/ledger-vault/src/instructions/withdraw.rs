use anchor_lang::prelude::*;
use anchor_spl::token::{
    Mint, 
    Token, 
    TokenAccount,
    Transfer,
    CloseAccount,
    close_account,
};

use crate::state::Vault;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut
    )]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
    )]
    pub vault_state: Account<'info, Vault>,
    pub token_program: Program<'info, Token>,
}

impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self) -> Result<()> {

        // let seeds = &[
        //     b"vault",
        //     self.user.to_account_info().key.as_ref(),
        //     self.mint.to_account_info().key.as_ref(),
        //     &[self.vault_state.vault_bump],
        // ];

        // let signer_seeds = &[&seeds[..]];

        Ok(())
    }

    pub fn close_vault(&mut self) -> Result<()> {


        Ok(())
    }
}