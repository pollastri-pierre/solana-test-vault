use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub vault_bump: u8,
    pub deposit_counter: u32,
}
impl Space for Vault {
    const INIT_SPACE: usize = 8 + 1 + 4;
}
