import { expect } from "chai";
import hre from "hardhat";
const {ethers} = await hre.network.connect();

describe("SmartAccount", function () {

    it("should execute operation", async function () {

        const [owner] = await ethers.getSigners();

        const EntryPoint = await ethers.getContractFactory("EntryPoint");
        const entryPoint = await EntryPoint.deploy();

        const SmartAccount = await ethers.getContractFactory("SmartAccount");
        const smartAccount =
            await SmartAccount.deploy(
                owner.address,
                await entryPoint.getAddress()
            );

        const Target = await ethers.getContractFactory("Target");
        const target = await Target.deploy();

        const iface = new ethers.Interface([
            "function setValue(uint256)"
        ]);

        const data =
            iface.encodeFunctionData("setValue",[42]);

        const callData =
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address","bytes"],
                [await target.getAddress(), data]
            );

        const userOp = {
            sender: await smartAccount.getAddress(),
            nonce: 0,
            callData,
            signature: "0x",
            paymaster: ethers.ZeroAddress
        };

        const hash =
            ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["address","uint256","bytes"],
                    [
                        userOp.sender,
                        userOp.nonce,
                        userOp.callData
                    ]
                )
            );

        const signature =
            await owner.signMessage(
                ethers.getBytes(hash)
            );

        userOp.signature = signature;

        await entryPoint.handleOps([userOp]);

        expect(await target.value()).to.equal(42);
    });
    
});