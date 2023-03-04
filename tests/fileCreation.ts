import { createHash } from "crypto";
import { SHA256 } from "crypto-js";
import { MerkleTree } from "merkletreejs";
import * as base32 from "base32-ts"
import crypto from 'crypto';
import QrCreator from "qr-creator";
import { HashTuple } from "../src/generated";
import totp from "totp-generator"
import fs from "fs";



function generateTotpSecret(): string {
    const randomBytes = crypto.randomBytes(20);

    const secretKey = base32.Base32.encode(randomBytes, "RFC4648");
    return secretKey;
}

function generateOtps(secret: string, amount: number): { leafHashes: Buffer[], initTime: number } {
    const initRealTime = Date.now()
    const initTime = Math.floor(initRealTime / 60000) * 60000;
    const leafHashes: Buffer[] = [];
    for (let i = 0; i < amount; i++) {
        const Otp = totp(secret, {
            period: 60,
            timestamp: initTime + i * 60000,
        })
        const hash = createHash("sha256").update(Otp).digest();
        const extendedHash = createHash("sha256").update(Buffer.concat([hash, Buffer.from(i.toString())])).digest();

        leafHashes.push(extendedHash);
    }
    return { leafHashes, initTime }
}


export function generateTotpObject(amount: number): { link: string, otps: Buffer[], initTime: number } {
    const secret = generateTotpSecret();
    const { leafHashes, initTime } = generateOtps(secret, amount);
    const link = generateQrLink(secret, "test", "test");

    return { link: link, otps: leafHashes, initTime };
}

export function createMerkleTree(leafValues: Buffer[]): MerkleTree {


    const tree = new MerkleTree(leafValues, SHA256)
    const root = tree.getRoot();

    return tree;


}

function createMerkleProofPath(tree: MerkleTree, index: number, leafValues: Buffer[]): HashTuple[] {
    const leafindex = leafValues[index];
    const proof = tree.getProof(leafindex);

    let proofPath: HashTuple[] = [];

    for (const element of proof) {
        let hashTupleObject: HashTuple = {
            hash: [],
            siblingIndex: 0
        };
        hashTupleObject.hash = [...element.data];
        if (element.position === "left") {
            hashTupleObject.siblingIndex = 0;
        }
        else if (element.position === "right") {
            hashTupleObject.siblingIndex = 1;
        }
        else throw new Error("Invalid position");
        proofPath.push(hashTupleObject);
    }


    return proofPath;
}

function generateQrLink(secret: string, securityChars: string, pubkey: string): string {
    const pubkeyShort = "Wallet%3A%20" + pubkey.slice(0, 3) + "..." + pubkey.slice(-3);
    const securityCharsEncoded = encodeURIComponent(securityChars);
    const link = "otpauth://totp/" + pubkeyShort + "?secret=" + secret + "&issuer=Bunkr%20%7C%20" + securityChars + "&algorithm=SHA1&digits=6&period=60";
    return link;
}

export function createHashChain(input: string, amount: number): Buffer {
    let hash: Buffer = Buffer.from(input);
    for (let i = 0; i < amount; i++) {
        hash = createHash("sha256").update(hash).digest()
    }
    return hash;
}

export function calculatePreImage(hash_image: Buffer, input: string, max_attempts: number) {
    let hash = createHash("sha256").update(Buffer.from(input)).digest()
    for (let i = 0; i < max_attempts; i++) {
        const new_hash = createHash("sha256").update(hash).digest()
        if (new_hash.equals(hash_image)) {
            return hash;
        }
        hash = new_hash;
    }
    throw new Error("Could not find preimage");
}

function encryptLeaves(signedMessage: string, leaves: Buffer[]): Buffer {

    const encryptionKey = crypto.createHash("sha256").update(signedMessage).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
    let encrypted = cipher.update(Buffer.concat(leaves));
    encrypted = Buffer.concat([iv, encrypted, cipher.final()]);
    return encrypted;
}

export function decryptLeaves(signedMessage: string, data: Buffer): Buffer[] {
    const encryptionKey = crypto.createHash("sha256").update(signedMessage).digest();
    const iv = data.subarray(0, 16);
    const encrypted = data.subarray(16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    let leaves: Buffer[] = [];
    for (let i = 0; i < decrypted.length; i += 32) {
        leaves.push(decrypted.subarray(i, i + 32));
    }
    return leaves
}

function writeFileData(filePath: string, data: Buffer) {
    fs.writeFile(filePath, data, (err) => {
        if (err) throw err
        else console.log("File written successfully\n");
        console.log(err)
    });
}

function readfileData(filePath: string): Buffer {
    const data = fs.readFileSync(filePath)
    return data;
}

// const secret = generateTotpSecret()
// console.log("Link", generateQrLink(secret, "A7EF", "A6bh5tngHgeXFbXopuqV2TcWPm7fyUA7RSU2yBPfZ4jN"));
// let startTime = Date.now() / 1000;
// const otps = generateOtps(secret, Math.pow(2, 20));
// let endTime = Date.now() / 1000;
// console.log(`Time to generate OTPs: ${endTime - startTime}s`);

// startTime = Date.now() / 1000;
// const tree = createMerkleTree(otps);
// console.log("Root: ", tree.getRoot().toString("hex"));
// endTime = Date.now() / 1000;
// console.log(`Time to generate Merkle Tree: ${endTime - startTime}s`)

// startTime = Date.now() / 1000;
// const proofPath = createMerkleProofPath(tree, 566, otps);
// endTime = Date.now() / 1000;
// console.log(`Time to generate Proof Path: ${endTime - startTime}s`)

// startTime = Date.now() / 1000;
// const hash = createHashChain("hello", 1000000);
// endTime = Date.now() / 1000;
// console.log(`Time to generate HashChain: ${endTime - startTime}s`)

// startTime = Date.now() / 1000;
// const encryptedData = encryptLeaves("password", otps);
// writeFileData("testleaves.bin", encryptedData);
// endTime = Date.now() / 1000;
// console.log(`Time to encrypt OTPs: ${endTime - startTime}s`)

// startTime = Date.now() / 1000;
// const decryptedData = decryptLeaves("password", encryptedData);
// endTime = Date.now() / 1000;
// console.log(`Time to decrypt OTPs: ${endTime - startTime}s`)

// startTime = Date.now() / 1000;
// const recreatedTree = createMerkleTree(otps);
// console.log("Re-created Root: ", recreatedTree.getRoot().toString("hex"));
// endTime = Date.now() / 1000;
// console.log(`Time to re-generate Merkle Tree: ${endTime - startTime}s`)

const hash = createHashChain("hello", Math.pow(2, 20));
console.log("Hash: ", hash.toString("hex"));

const preImage = calculatePreImage(hash, "hell", Math.pow(2, 20));
console.log("Preimage: ", preImage.toString("hex"));