import * as crypto from "crypto";
import * as readline from "readline";
import * as fs from "fs";

const subtle = crypto.subtle;

async function generateKey(password, salt, iv) {
    const encoder = new TextEncoder();

    const keyInfo = await subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    const key = await subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyInfo,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt"]
    );

    return key;
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Newline not included
const password = await new Promise(resolve => {
    rl.question("Password: ", resolve);
});

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

console.log("Salt:", salt)
console.log("IV:", iv)

const key = await generateKey(password, salt, iv);

let encoder = new TextEncoder();

for (let file of fs.readdirSync("./src-private/")) {
    let privateFilename = `./src-private/${file}`;
    let publicFilename = `./src-public/${file}`;

    if (privateFilename.endsWith(".png") || privateFilename.endsWith(".jpg")) {
        const data = fs.readFileSync(privateFilename);
        const buffer = data.buffer;

        let encrypted = await subtle.encrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            buffer
        );

        fs.writeFileSync(publicFilename, Buffer.from(encrypted));
    } else if (privateFilename.endsWith(".json")) {
        const data = fs.readFileSync(privateFilename, "utf8");

        let encrypted = await subtle.encrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            encoder.encode(data)
        );

        fs.writeFileSync(publicFilename, Buffer.from(encrypted));
    }
}

rl.close();
