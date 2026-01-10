use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::ID as METADATA_PROGRAM_ID;

declare_id!("Fb7uNXapsRwUdsvGDedesLS7D1A4AHk6CeMvrrvTVqwf");

#[program]
pub mod planet_nft {
    use super::*;

    pub fn mint_planet_nft(
        ctx: Context<MintPlanetNft>,
        planet_id: String,
        planet_name: String,
        metadata_uri: String,
    ) -> Result<()> {
        msg!("Minting Planet NFT: {} ({})", planet_name, planet_id);
        msg!("Metadata URI: {}", metadata_uri);

        // Mint 1 token to the token account
        // Use mint_authority PDA seeds for signing
        let seeds = &[
            b"mint_authority",
            planet_id.as_bytes(),
            &[ctx.bumps.mint_authority],
        ];
        let signer = &[&seeds[..]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer,
            ),
            1, // Amount: 1 for NFT
        )?;

        // Verify metadata PDA is correct
        let mint_key = ctx.accounts.mint.key();
        let metadata_seeds = &[
            b"metadata",
            METADATA_PROGRAM_ID.as_ref(),
            mint_key.as_ref(),
        ];
        let (expected_metadata_pda, _metadata_bump) = Pubkey::find_program_address(
            metadata_seeds,
            &METADATA_PROGRAM_ID,
        );
        require!(
            ctx.accounts.metadata.key() == expected_metadata_pda,
            ErrorCode::InvalidMetadataAccount
        );

        // Create metadata account (derived PDA)
        let metadata_account_info = &mut ctx.accounts.metadata.to_account_info();
        let mint_account_info = &ctx.accounts.mint.to_account_info();
        let mint_authority_info = &ctx.accounts.mint_authority.to_account_info();
        let payer_info = &ctx.accounts.payer.to_account_info();
        let token_metadata_program_info = &ctx.accounts.token_metadata_program.to_account_info();
        let system_program_info = &ctx.accounts.system_program.to_account_info();
        let rent_info = &ctx.accounts.rent.to_account_info();

        let creators = vec![];
        let metadata_data_v2 = DataV2 {
            name: planet_name.clone(),
            symbol: "PLANET".to_string(),
            uri: metadata_uri.clone(),
            seller_fee_basis_points: 0,
            creators: Some(creators),
            collection: None,
            uses: None,
        };

        create_metadata_accounts_v3(
            CpiContext::new(
                token_metadata_program_info.clone(),
                CreateMetadataAccountsV3 {
                    metadata: metadata_account_info.clone(),
                    mint: mint_account_info.clone(),
                    mint_authority: mint_authority_info.clone(),
                    update_authority: mint_authority_info.clone(),
                    payer: payer_info.clone(),
                    system_program: system_program_info.clone(),
                    rent: rent_info.clone(),
                },
            ),
            metadata_data_v2,
            false, // is_mutable
            true,  // update_authority_is_signer
            None,  // collection_details
        )?;

        msg!("Planet NFT minted successfully!");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(planet_id: String, planet_name: String, metadata_uri: String)]
pub struct MintPlanetNft<'info> {
    #[account(
        init,
        seeds = [b"planet_nft", planet_id.as_bytes()],
        bump,
        payer = payer,
        mint::decimals = 0,
        mint::authority = mint_authority,
    )]
    pub mint: Account<'info, Mint>,

    /// CHECK: Mint authority PDA - uses separate seeds from mint
    #[account(
        seeds = [b"mint_authority", planet_id.as_bytes()],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = mint_authority,
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK: Metadata account (PDA derived from mint by Metaplex)
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = METADATA_PROGRAM_ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid metadata account")]
    InvalidMetadataAccount,
}
