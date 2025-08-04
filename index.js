const salt_ = [
  138,  74,  72, 107,  13, 141,
  125,   9,  99, 189, 254,   0,
  216, 187, 119, 158
];

const iv_ = [
  49, 139, 134, 177,  90,
  38, 238, 225, 126, 231,
  63,  31
];

const salt = new Uint8Array(16);
const iv = new Uint8Array(12);

for (let i = 0; i < 16; i++) {
    salt[i] = salt_[i];
}

for (let i = 0; i < 12; i++) {
    iv[i] = iv_[i];
}

console.log(salt);
console.log(iv);

const subtle = window.crypto.subtle;

async function loadFile(path) {
    const response = await fetch(path);

    return await response.arrayBuffer();
}

async function loadPage(data, key) {
    document.querySelector("#password-overlay").style.display = "none";

    for (let el of data.elements) {
        if (el.type === "text") {
            let result = document.createElement("p");

            result.innerHTML = el.p;
            document.querySelector("#content").appendChild(result);
        } else if (el.type === "image") {
            let result = document.createElement("img");

            let imageBuffer = await loadFile(el.src);

            let decrypted = await subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                imageBuffer
            );

            let blob = new Blob([decrypted], { type: "image/png" });

            result.src = URL.createObjectURL(blob);

            document.querySelector("#content").appendChild(result);
        }
    }
}

document.querySelector("#password-button").onclick = async () => {
    let password = document.querySelector("#password-field").value;

    let encoder = new TextEncoder();
    let decoder = new TextDecoder();

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
        ["decrypt"]
    );

    const pageBuffer = await loadFile("/src-public/page.json");

    try {
        const decryptedPage = await subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            pageBuffer
        );

        let pageData = JSON.parse(decoder.decode(decryptedPage));

        await loadPage(pageData, key);
    } catch (err) {
        let msg = document.createElement("p");
        msg.innerText = "nuh uh";

        document.querySelector("#overlay-group").appendChild(msg);
    }
};
