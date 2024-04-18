const ZtxChainSDK = require('zetrix-sdk-nodejs');
const co = require('co');
const fs = require("fs");
const BigNumber = require('bignumber.js');
const sleep = require("../utils/delay");
// require('dotenv').config({path: ".env"})

/*
 Specify the zetrix address and private key
 */
// const privateKey = process.env.PRIVATE_KEY;
// const sourceAddress = process.env.ZTX_ADDRESS;
const privateKey = "privBw3WuHU8KDY7NhhcC3a8d8cE25u8ZbiVYyk2nB9ePL8NX4GWVahX"
const sourceAddress = "ZTX3Z2ehcTibc7xqFBDZyhEDMRxmM6mwH32E6"
const nodeUrl = "52.81.215.222:19333"
// console.log(privateKey,sourceAddress)

/*
 Specify the smart contract file name
 */
const contractName = 'base.js'
// 18.19.1
/*
 Specify the Zetrix Node url
 */
const sdk = new ZtxChainSDK({
  host: "52.81.215.222:19333",
  secure: false /* set to false if without SSL */
});

let contractData = fs.readFileSync('./contracts/' + contractName, 'utf8');

co(function* () {

  console.log("#####################################")
  console.log("###  Start Deployment...")
  console.log("#####################################")
  console.log("");

  const nonceResult = yield sdk.account.getNonce(sourceAddress);

  if (nonceResult.errorCode !== 0) {
    console.log("nonceResult", nonceResult);
    console.log("### ERROR while getting nonce...")
    return;
  }

  let nonce = nonceResult.result.nonce;
  nonce = new BigNumber(nonce).plus(1).toString(10);

  console.log("Your current nonce is", nonce);

  /*
   Specify the input parameters for contract initialization
   */
  let input = 
  {
    "committee" : ["ZTX3Z2ehcTibc7xqFBDZyhEDMRxmM6mwH32E6"]
  }

  let contractCreateOperation = sdk.operation.contractCreateOperation({
    sourceAddress: sourceAddress,
    initBalance: '0',
    payload: contractData,
    initInput: JSON.stringify(input),
  });

  if (contractCreateOperation.errorCode !== 0) {
    console.log(contractCreateOperation)
    console.log("### ERROR while create contract operation...")
    return;
  }

  const operationItem = contractCreateOperation.result.operation;

  let feeData = yield sdk.transaction.evaluateFee({
    sourceAddress,
    nonce,
    operations: [operationItem],
    signtureNumber: '100',
  });

  if (feeData.errorCode !== 0) {
    console.log(feeData)
    console.log("### ERROR while evaluating fee...")
    return;
  }

  let feeLimit = feeData.result.feeLimit;
  let gasPrice = feeData.result.gasPrice;

  console.log("Fee limit for this contract is", feeLimit);
  console.log("Estimated gas price is", gasPrice);

  const blobInfo = sdk.transaction.buildBlob({
    sourceAddress: sourceAddress,
    gasPrice: gasPrice,
    feeLimit: feeLimit,
    nonce: nonce,
    operations: [operationItem],
  });

  const signed = sdk.transaction.sign({
    privateKeys: [privateKey],
    blob: blobInfo.result.transactionBlob
  })

  let submitted = yield sdk.transaction.submit({
    signature: signed.result.signatures,
    blob: blobInfo.result.transactionBlob
  })

  if (submitted.errorCode !== 0) {
    console.log(submitted)
    console.log("### ERROR while submitting contract...")
    return;
  }

  console.log("");
  let info = null;
  for (let i = 0; i < 10; i++) {
    console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
    info = yield sdk.transaction.getInfo(submitted.result.hash)
    if (info.errorCode === 0) {
      break;
    }
    sleep(2000);
  }

  console.log("");
  if (info != null && info.errorCode === 0) {
    console.log("Your contract has been successfully deployed.")
    console.log("Contract address", JSON.parse(info.result.transactions[0].error_desc)[0].contract_address);
    console.log("Hash value", submitted.result.hash);
  } else {
    console.log("Your contract deployment has failed.")
    console.log("Hash value", submitted.result.hash);
  }

  console.log("");
  console.log("#####################################")
  console.log("### Finish Deployment...")
  console.log("#####################################")
});
