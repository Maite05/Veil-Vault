// Anchor migration script — runs once after `anchor deploy`.
// Initialise any on-chain state that must exist before the app is usable.
// For VeilVault the program is permissionless (each user initialises their
// own vault), so no global state needs seeding here.

import * as anchor from "@coral-xyz/anchor";

module.exports = async function (provider: anchor.AnchorProvider) {
  anchor.setProvider(provider);
  console.log("VeilVault deployed. Program ID:", process.env["ANCHOR_PROGRAM_ID"]);
  console.log("Each user creates their own vault via initialize_vault.");
};
