const crypto = require('crypto');
const fs = require('fs');

function encryptFile(sourcePath, destPath, key, iv) {
    const data = fs.readFileSync(sourcePath, 'utf8');
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    fs.writeFileSync(destPath, encrypted, 'utf8');
    fs.unlinkSync(sourcePath);
    return true;
}

function loadEncryptedFile(filePath, key, iv) {
    if (!fs.existsSync(filePath)) return null;
    const encryptedData = fs.readFileSync(filePath, 'utf8');
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (e) {
        console.error("❌ Failed to decrypt config file. Check your KEY and IV.");
        return null;
    }
}

module.exports = { encryptFile, loadEncryptedFile };
