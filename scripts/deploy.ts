import hre from "hardhat";
const {ethers} = await hre.network.connect();
async function main() {

    const [owner] = await ethers.getSigners();

    console.log("Owner:", owner.address);

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();
    await entryPoint.waitForDeployment();

    const entryPointAddress = await entryPoint.getAddress();
    console.log("EntryPoint:", entryPointAddress);
const SmartAccount = await ethers.getContractFactory("SmartAccount");
    const smartAccount = await SmartAccount.deploy(
        owner.address,
        entryPointAddress
    );
    await smartAccount.waitForDeployment();
    console.log("SmartAccount:", await smartAccount.getAddress());
    const Paymaster = await ethers.getContractFactory("Paymaster");
    const paymaster = await Paymaster.deploy();
    await paymaster.waitForDeployment();

    console.log( "Paymaster:",  await paymaster.getAddress());

    const Target = await ethers.getContractFactory("Target");
    const target = await Target.deploy();
    await target.waitForDeployment();

    console.log(  "Target:",await target.getAddress() );
    
    const Target2 = await ethers.getContractFactory("Target2");
    const target2 = await Target2.deploy();
    await target2.waitForDeployment();

    console.log("Target2:",await target2.getAddress());

    const iface = new ethers.Interface([
        "function setValue(uint256)"
    ]);

    const data =
        iface.encodeFunctionData("setValue",[100]);

    const callData =
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address","bytes"],
            [await target.getAddress(), data]
        );
        
    const data2 =
        iface.encodeFunctionData("setValue",[100]);

    const callData2 =
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address","bytes"],
            [await target2.getAddress(), data2]
        );
const currentNonce = await smartAccount.nonce();
const nonce0 = BigInt(currentNonce.toString());   
    const userOp = {
        sender: await smartAccount.getAddress(),
        nonce: nonce0,
        callData,
        signature: "0x",
        paymaster: await paymaster.getAddress()
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
        
    const userOp2 = {
        sender: await smartAccount.getAddress(),
        nonce: nonce0+1n,
        callData: callData2,
        signature: "0x",
        paymaster: await paymaster.getAddress()
    };

    const hash2 =
        ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address","uint256","bytes"],
                [
                    userOp2.sender,
                    userOp2.nonce,
                    userOp2.callData
                ]
            )
        );

    const signature =
        await owner.signMessage(
            ethers.getBytes(hash)
        );

    userOp.signature = signature;
    const signature2 =
        await owner.signMessage(
            ethers.getBytes(hash2)
        );  

    userOp2.signature = signature2;

    const tx =
        await entryPoint.handleOps([userOp2,userOp]);

    await tx.wait();

    const value = await target.value();

    console.log("Target value:", value.toString());
    const value2 = await target2.value();

    console.log("Target2 value:", value2.toString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});