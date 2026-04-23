// Web Crypto API Utility for ECDH and AES-GCM

export async function generateEphemeralKeys(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true, // extractable
        ["deriveKey", "deriveBits"]
    );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    const exportedAsString = String.fromCharCode.apply(null, Array.from(new Uint8Array(exported)));
    return btoa(exportedAsString);
}

export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
    const binaryDerString = atob(base64Key);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    return await window.crypto.subtle.importKey(
        "raw",
        binaryDer,
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true,
        []
    );
}

export async function deriveSecretKey(privateKey: CryptoKey, foreignPublicKey: CryptoKey): Promise<CryptoKey> {
    return await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: foreignPublicKey
        },
        privateKey,
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptMessage(text: string, sharedSecret: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const enc = new TextEncoder();
    const encoded = enc.encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        sharedSecret,
        encoded
    );

    const ciphertextBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(ciphertextBuffer))));
    const ivBase64 = btoa(String.fromCharCode.apply(null, Array.from(iv)));

    return { ciphertext: ciphertextBase64, iv: ivBase64 };
}

export async function decryptMessage(ciphertextBase64: string, ivBase64: string, sharedSecret: CryptoKey): Promise<string> {
    const ciphertextString = atob(ciphertextBase64);
    const ciphertext = new Uint8Array(ciphertextString.length);
    for (let i = 0; i < ciphertextString.length; i++) {
        ciphertext[i] = ciphertextString.charCodeAt(i);
    }

    const ivString = atob(ivBase64);
    const iv = new Uint8Array(ivString.length);
    for (let i = 0; i < ivString.length; i++) {
        iv[i] = ivString.charCodeAt(i);
    }

    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            sharedSecret,
            ciphertext
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
    } catch (e) {
        console.error("Decryption failed", e);
        return "[Decryption Error]";
    }
}
