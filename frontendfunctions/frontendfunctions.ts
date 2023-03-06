import * as web3 from "@solana/web3.js";
import { Bunkr } from "../src/generated/accounts";


export async function checkBunkrExistence(userPubkey: web3.PublicKey, programID: web3.PublicKey, connection: web3.Connection) {

    const bunkrAccount = web3.PublicKey.findProgramAddressSync([Buffer.from("bunkr"), userPubkey.toBuffer()], programID)[0];
    const accountInfo = await connection.getAccountInfo(bunkrAccount);
    if (accountInfo === null) {
        return false;
    }
    const space = Bunkr.deserialize(accountInfo.data)[0].shadowDriveSpace;
    return space;
}

const connection = new web3.Connection("https://api.devnet.solana.com");
const userPubkey = new web3.PublicKey("B93EYGbkngEgApWYjtrLxXR5T4w28B3ErZeENStkCsx7");
const programID = new web3.PublicKey("3PHnbmYZU1zVmD3rrLbkFTQonrRFj2GwRZwnLHJunAfL");

(async () => {
    const output = await checkBunkrExistence(userPubkey, programID, connection);
    console.log(output);
})();