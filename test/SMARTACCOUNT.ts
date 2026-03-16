import { expect } from "chai";
import { network } from "hardhat";
const { ethers } = await network.connect();

/**
 * Helper function to sign transaction data matching the contract's hash format
 * The contract uses: keccak256(abi.encodePacked(to, value, data))
 */
async function signTransaction(signer: any, to: string, value: any, data: string) {
  const hash = ethers.solidityPacked(["address", "uint256", "bytes"], [to, value, data]);
  const messageHash = ethers.keccak256(hash);
  
  // Sign the hash directly (with message prefix)
  const messageHashBytes = ethers.getBytes(messageHash);
  return await signer.signMessage(messageHashBytes);
}

describe("SmartAccountSimple", function () {
  // Test accounts
  let owner: any;
  let attacker: any;
  let recipient: any;
  let smartAccount: any;

  beforeEach(async function () {
    const [signerOwner, signerAttacker, signerRecipient] = await ethers.getSigners();
    owner = signerOwner;
    attacker = signerAttacker;
    recipient = signerRecipient;

    // Deploy SmartAccountSimple with the correct owner address
    const SmartAccountSimple = await ethers.getContractFactory("SmartAccountSimple");
    smartAccount = await SmartAccountSimple.deploy(owner.address);
    await smartAccount.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner during deployment", async function () {
      expect(await smartAccount.owner()).to.equal(owner.address);
    });

    it("Should revert if owner is zero address", async function () {
      const SmartAccountSimple = await ethers.getContractFactory("SmartAccountSimple");
      await expect(
        SmartAccountSimple.deploy("0x0000000000000000000000000000000000000000")
      ).to.be.revertedWith("Owner cannot be zero address");
    });

    it("Should allow receiving ETH", async function () {
      const tx = await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("1"),
      });
      await tx.wait();

      const balance = await ethers.provider.getBalance(await smartAccount.getAddress());
      expect(balance).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Execute Function", function () {
    it("Should execute a valid transaction with correct signature", async function () {
  // Fund the smart account
  await owner.sendTransaction({
    to: await smartAccount.getAddress(),
    value: ethers.parseEther("1"),
  });

  // Sign the transaction
  const signature = await signTransaction(owner, recipient.address, ethers.parseEther("0.5"), "0x");
console.log("Sending tx:+");
const before = await ethers.provider.getBalance(recipient.address);
  // Execute
  const tx = await smartAccount.execute(recipient.address, ethers.parseEther("0.5"), "0x", signature);
  console.log("Transaction sent, waiting for confirmation...");
  await tx.wait();
  console.log("Transaction executed successfully");
  // Verify recipient got the ETH
  const after = await ethers.provider.getBalance(recipient.address);
  expect(after - before).to.equal(ethers.parseEther("0.5"));
});
    it("Should revert with invalid signature from non-owner", async function () {
      // Fund the smart account
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("1"),
      });

      // Create and sign the transaction with attacker (not owner)
      const to = recipient.address;
      const value = ethers.parseEther("0.5");
      const data = "0x";
      const signature = await signTransaction(attacker, to, value, data);

      // Try to execute - should revert
      await expect(smartAccount.execute(to, value, data, signature)).to.be.revertedWith(
        "Invalid signature"
      );
    });

    it("Should revert with tampered transaction parameters", async function () {
      // Fund the smart account
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("1"),
      });

      // Create and sign the transaction with one set of parameters
      let to = recipient.address;
      let value = ethers.parseEther("0.5");
      let data = "0x";
      let signature = await signTransaction(owner, to, value, data);

      // Try to use the signature with different parameters
      const newValue = ethers.parseEther("0.1");
      await expect(smartAccount.execute(to, newValue, data, signature)).to.be.revertedWith(
        "Invalid signature"
      );
    });

    it("Should revert with invalid signature length", async function () {
      const to = recipient.address;
      const value = ethers.parseEther("0.5");
      const data = "0x";
      const invalidSignature = "0x"; // Invalid signature

      await expect(smartAccount.execute(to, value, data, invalidSignature)).to.be.revertedWith(
        "Invalid signature length"
      );
    });

    it("Should revert if transaction execution fails", async function () {
      // Create a contract that reverts on fallback
      const revertingContractFactory = await ethers.getContractFactory("Counter");
      const revertingContract = await revertingContractFactory.deploy();
      await revertingContract.waitForDeployment();

      // Fund the smart account
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("1"),
      });

      // Create a call that will revert (calling a non-existent function)
      const to = await revertingContract.getAddress();
      const value = "0";
      const data = "0xdeadbeef"; // Invalid function selector
      const signature = await signTransaction(owner, to, value, data);

      // Try to execute - should revert due to failed call
      await expect(smartAccount.execute(to, value, data, signature)).to.be.revertedWith(
        "Transaction failed"
      );
    });

    it("Should execute transactions with contract call data", async function () {
      const counterFactory = await ethers.getContractFactory("Counter");
      const counter = await counterFactory.deploy();
      await counter.waitForDeployment();

      // Fund the smart account
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("1"),
      });

      // Get the function signature for Counter's inc() function
      const data = counter.interface.encodeFunctionData("inc");
      const to = await counter.getAddress();
      const value = "0";

      // Create and sign the transaction
      const signature = await signTransaction(owner, to, value, data);

      // Execute
      const tx = await smartAccount.execute(to, value, data, signature);
      await tx.wait();

      // Verify the counter incremented
      const counterValue = await counter.x();
      expect(counterValue).to.equal(1n);
    });

    it("Should handle zero value transfers", async function () {
      // Create a dummy contract to call
      const counterFactory = await ethers.getContractFactory("Counter");
      const counter = await counterFactory.deploy();
      await counter.waitForDeployment();

      const data = counter.interface.encodeFunctionData("inc");
      const to = await counter.getAddress();
      const value = "0";

      // Create and sign the transaction
      const signature = await signTransaction(owner, to, value, data);

      // Execute
      const tx = await smartAccount.execute(to, value, data, signature);
      await tx.wait();

      // Verify transaction succeeded
      expect(tx).to.not.be.undefined;
    });

    it("Should handle large ETH transfers", async function () {
      // Fund the smart account with 100 ETH
      const fundAmount = ethers.parseEther("100");
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: fundAmount,
      });

      // Transfer 99 ETH
      const to = recipient.address;
      const value = ethers.parseEther("99");
      const data = "0x";

      // Create and sign the transaction
      const signature = await signTransaction(owner, to, value, data);

      // Execute
      const tx = await smartAccount.execute(to, value, data, signature);
      await tx.wait();

      // Verify the balance
      const contractBalance = await ethers.provider.getBalance(await smartAccount.getAddress());
      expect(contractBalance).to.equal(ethers.parseEther("1"));
    });
  });

  describe("RecoverSigner Function", function () {
    it("Should correctly recover the signer", async function () {
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("1"),
      });

      const to = recipient.address;
      const value = ethers.parseEther("0.1");
      const data = "0x";

      // Create and sign the transaction
      const signature = await signTransaction(owner, to, value, data);

      // If recoverSigner works correctly, this will execute successfully
      const tx = await smartAccount.execute(to, value, data, signature);
      await tx.wait();

      expect(tx).to.not.be.undefined;
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should not allow signature replay attacks with different parameters", async function () {
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      // First transaction
      let to = recipient.address;
      let value = ethers.parseEther("1");
      let data = "0x";
      let signature = await signTransaction(owner, to, value, data);

      // Execute first transaction
      let tx = await smartAccount.execute(to, value, data, signature);
      await tx.wait();

      // Try to reuse the same signature with different recipient
      const newRecipient = attacker.address;
      await expect(
        smartAccount.execute(newRecipient, value, data, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should maintain owner immutability", async function () {
      const currentOwner = await smartAccount.owner();
      expect(currentOwner).to.equal(owner.address);

      // Try to execute with attacker and verify it still fails
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("1"),
      });

      const to = recipient.address;
      const value = ethers.parseEther("0.1");
      const data = "0x";
      const signature = await signTransaction(attacker, to, value, data);

      await expect(smartAccount.execute(to, value, data, signature)).to.be.revertedWith(
        "Invalid signature"
      );

      // Owner should still be the same
      expect(await smartAccount.owner()).to.equal(owner.address);
    });

    it("Should handle multiple sequential transactions", async function () {
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      // Execute 3 sequential transactions
      for (let i = 0; i < 3; i++) {
        const to = recipient.address;
        const value = ethers.parseEther("0.5");
        const data = "0x";

        const signature = await signTransaction(owner, to, value, data);

        const tx = await smartAccount.execute(to, value, data, signature);
        await tx.wait();
      }

      // Verify contract balance
      const contractBalance = await ethers.provider.getBalance(await smartAccount.getAddress());
      expect(contractBalance).to.equal(ethers.parseEther("8.5"));
    });

    it("Should prevent execution with oversized signature", async function () {
      const to = recipient.address;
      const value = ethers.parseEther("0.1");
      const data = "0x";

      // Create an oversized signature (more than 65 bytes)
      const oversizedSignature = "0x" + "00".repeat(100);

      await expect(smartAccount.execute(to, value, data, oversizedSignature)).to.be.revertedWith(
        "Invalid signature length"
      );
    });

    it("Should process transactions in order", async function () {
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("5"),
      });

      const transactions = [];

      // Create multiple transactions
      for (let i = 0; i < 3; i++) {
        const to = recipient.address;
        const value = ethers.parseEther("0.5");
        const data = "0x";

        const signature = await signTransaction(owner, to, value, data);

        transactions.push({ to, value, data, signature });
      }

      // Execute them in order
      for (const tx of transactions) {
        const receipt = await smartAccount.execute(tx.to, tx.value, tx.data, tx.signature);
        await receipt.wait();
      }

      // Verify the final balance
      const finalBalance = await ethers.provider.getBalance(await smartAccount.getAddress());
      expect(finalBalance).to.equal(ethers.parseEther("3.5"));
    });
  });

  describe("Integration Tests", function () {
    it("Should execute complex transaction sequences", async function () {
      // Fund the smart account
      await owner.sendTransaction({
        to: await smartAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      // Step 1: Direct ETH transfer
      const recipient1 = attacker.address;
      const value1 = ethers.parseEther("2");
      const data1 = "0x";

      const signature1 = await signTransaction(owner, recipient1, value1, data1);

      let tx = await smartAccount.execute(recipient1, value1, data1, signature1);
      await tx.wait();

      // Step 2: Contract interaction
      const counterFactory = await ethers.getContractFactory("Counter");
      const counter = await counterFactory.deploy();
      await counter.waitForDeployment();

      const data2 = counter.interface.encodeFunctionData("incBy", [5n]);
      const to2 = await counter.getAddress();
      const value2 = "0";

      const signature2 = await signTransaction(owner, to2, value2, data2);

      tx = await smartAccount.execute(to2, value2, data2, signature2);
      await tx.wait();

      // Verify both operations
      expect(await ethers.provider.getBalance(recipient1)).to.be.gte(value1);
      expect(await counter.x()).to.equal(5n);
    });
  });
});
