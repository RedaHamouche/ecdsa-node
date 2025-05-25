const express = require("express");
const app = express();
const cors = require("cors");
const port = 3042;

app.use(cors());
app.use(express.json());

const secp = require("ethereum-cryptography/secp256k1");
const { toHex } = require("ethereum-cryptography/utils");
const { keccak256 } = require("ethereum-cryptography/keccak");

// Function to convert public key to Ethereum address
function getEthAddress(publicKey) {
  const publicKeyWithoutPrefix = publicKey.slice(1);
  const hash = keccak256(publicKeyWithoutPrefix);
  const address = hash.slice(-20);
  return "0x" + toHex(address);
}

// Function to recover public key from signature
function recoverPublicKey(message, signature, recoveryBit) {
  const messageHash = keccak256(Buffer.from(message));
  return secp.recoverPublicKey(messageHash, signature, recoveryBit);
}

// Generate private keys
const privateKey1 = secp.utils.randomPrivateKey();
const privateKey2 = secp.utils.randomPrivateKey();
const privateKey3 = secp.utils.randomPrivateKey();

// Get public keys
const publicKey1 = secp.getPublicKey(privateKey1);
const publicKey2 = secp.getPublicKey(privateKey2);
const publicKey3 = secp.getPublicKey(privateKey3);

// Convert public keys to Ethereum addresses
const address1 = getEthAddress(publicKey1);
const address2 = getEthAddress(publicKey2);
const address3 = getEthAddress(publicKey3);

const balances = {
  [address1]: 100,
  [address2]: 50,
  [address3]: 75,
};

console.log("Private keys:", {
  key1: toHex(privateKey1),
  key2: toHex(privateKey2),
  key3: toHex(privateKey3),
});
console.log("Ethereum addresses:", {
  address1,
  address2,
  address3,
});
console.log("Initial balances:", balances);

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", (req, res) => {
  const { sender, recipient, amount, signature, recoveryBit } = req.body;

  // Verify the signature
  try {
    const message = JSON.stringify({
      sender,
      recipient,
      amount,
    });

    const publicKey = recoverPublicKey(message, signature, recoveryBit);
    const recoveredAddress = getEthAddress(publicKey);

    // Check if the recovered address matches the sender
    if (recoveredAddress !== sender) {
      res.status(400).send({ message: "Invalid signature!" });
      return;
    }

    setInitialBalance(sender);
    setInitialBalance(recipient);

    if (balances[sender] < amount) {
      res.status(400).send({ message: "Not enough funds!" });
    } else {
      balances[sender] -= amount;
      balances[recipient] += amount;
      res.send({ balance: balances[sender] });
    }
  } catch (error) {
    res.status(400).send({ message: "Invalid signature!" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}
