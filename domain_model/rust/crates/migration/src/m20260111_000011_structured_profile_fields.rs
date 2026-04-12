use sea_orm_migration::prelude::*;

/// Migration 011 — Structured profile fields
///
/// Adds support for the actual Clerk metadata data shapes on the `pilgrims` table:
///  - Structured phone number (phone_code, phone_country — not PII)
///  - Emergency contacts JSON array (emergency_contacts_encrypted)
///  - Identity documents JSON array (documents_encrypted)
///
/// The existing `address_street_2_encrypted` column is already present from migration 002
/// so it is not re-added here.
///
/// All encrypted columns store AES-256-GCM ciphertext (handled by the service layer).
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // phone_code — dialing prefix e.g. "+34", not PII
        manager
            .alter_table(
                Table::alter()
                    .table(Pilgrims::Table)
                    .add_column_if_not_exists(
                        ColumnDef::new(Pilgrims::PhoneCode)
                            .string()
                            .null()
                            .comment("E.164 dialing prefix e.g. +34 — not PII"),
                    )
                    .to_owned(),
            )
            .await?;

        // phone_country — ISO 3166-1 alpha-2, not PII
        manager
            .alter_table(
                Table::alter()
                    .table(Pilgrims::Table)
                    .add_column_if_not_exists(
                        ColumnDef::new(Pilgrims::PhoneCountry)
                            .string()
                            .null()
                            .comment("ISO 3166-1 alpha-2 phone country e.g. ES — not PII"),
                    )
                    .to_owned(),
            )
            .await?;

        // emergency_contacts_encrypted — JSON array of EmergencyContactEntry, AES-256-GCM
        manager
            .alter_table(
                Table::alter()
                    .table(Pilgrims::Table)
                    .add_column_if_not_exists(
                        ColumnDef::new(Pilgrims::EmergencyContactsEncrypted)
                            .text()
                            .null()
                            .comment("Encrypted JSON: EmergencyContactEntry[] with structured phone"),
                    )
                    .to_owned(),
            )
            .await?;

        // documents_encrypted — JSON array of PilgrimDocument, AES-256-GCM
        manager
            .alter_table(
                Table::alter()
                    .table(Pilgrims::Table)
                    .add_column_if_not_exists(
                        ColumnDef::new(Pilgrims::DocumentsEncrypted)
                            .text()
                            .null()
                            .comment("Encrypted JSON: PilgrimDocument[] with scan image refs"),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        for col in [
            Pilgrims::PhoneCode,
            Pilgrims::PhoneCountry,
            Pilgrims::EmergencyContactsEncrypted,
            Pilgrims::DocumentsEncrypted,
        ] {
            manager
                .alter_table(
                    Table::alter()
                        .table(Pilgrims::Table)
                        .drop_column(col)
                        .to_owned(),
                )
                .await?;
        }
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Pilgrims {
    Table,
    PhoneCode,
    PhoneCountry,
    EmergencyContactsEncrypted,
    DocumentsEncrypted,
}
