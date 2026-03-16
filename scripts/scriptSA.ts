
import hre from "hardhat";
const { ethers } = await  hre.network.connect();

async function main() {

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  const ownerAddress = deployer.address; 
  const SmartAccountSimple = await ethers.getContractFactory("SmartAccountSimple");
  const smartAccount = await SmartAccountSimple.deploy(ownerAddress);

  await smartAccount.waitForDeployment();

  console.log("SmartAccountSimple deployed to:", await smartAccount.getAddress()  );
  console.log("Owner of the wallet is:", ownerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });