const ZtxChainSDK = require('zetrix-sdk-nodejs');
const expect = require('chai').expect;
const BigNumber = require('bignumber.js');
const sleep = require("../utils/delay");
// require('dotenv').config({path: "/../.env"})
require('mocha-generators').install();

/*
 Specify the zetrix address and private key
 */
const privateKey = "privBw3WuHU8KDY7NhhcC3a8d8cE25u8ZbiVYyk2nB9ePL8NX4GWVahX";
const sourceAddress = "ZTX3Z2ehcTibc7xqFBDZyhEDMRxmM6mwH32E6"
const nodeUrl = "52.81.215.222:19333"
/*
 Specify the smart contract address
 */



const contractAddress = "ZTX3KMywRapcyKZD9iD154mDFxBTkWadiVGcb"


const address2 = "ZTX3GcfTpPRyi9JqndSv326U9QAdCeJnEoLQi"
const privateKey2 = "privBzzknRpojo3ohgryVqsS87DFYx5tbFZy1a7UEo5ottKBMp1pmhmK"
const address3 = ""
const privateKey3 = ""
const address4 = ""
const privateKey4 = ""
const address5 = ""
const privateKey5 = ""
const address6 = ""
const privateKey6 = ""


/*
 Specify the Zetrix Node url
 */
const sdk = new ZtxChainSDK({
  host: nodeUrl,
  secure: false /* set to false if without SSL */
});

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

describe('Testing smart contract',async function () {
  this.timeout(500000)
  describe("Testing apply and approve function",async ()=>{
    this.timeout(60000)

    // committee apply check
    it('Applying to become a committee member', async () =>  {
      const nonceResult = await sdk.account.getNonce(address2);
  
  
      expect(nonceResult.errorCode).to.equal(0)
  
      let nonce = nonceResult.result.nonce;
      nonce = new BigNumber(nonce).plus(1).toString(10);
      // console.log(nonce)
  
 
      let input = {
        "method": "apply",
        "params": {
          "role": "committee",
          "ratio": 0,
          "node": address2
        }
      }
  
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address2,
        gasAmount: '0',
        input: JSON.stringify(input),
      });

  
      expect(contractInvoke.errorCode).to.equal(0)
  
      const operationItem = contractInvoke.result.operation;
  
      const args = {
        sourceAddress:address2,
        nonce,
        operations: [operationItem],
      };
  
      let feeData = await sdk.transaction.evaluateFee(args);
  
      console.log(feeData)
      expect(feeData.errorCode).to.equal(0)
  
      let feeLimit = feeData.result.feeLimit;
      let gasPrice = feeData.result.gasPrice;
  
      const blobInfo = sdk.transaction.buildBlob({
        sourceAddress: address2,
        nonce,
        gasPrice: gasPrice,
        feeLimit: feeLimit,
        operations: [operationItem],
        signtureNumber: '1',
      });
  
      console.log(blobInfo);
      expect(blobInfo.errorCode).to.equal(0)
  
      const signed = sdk.transaction.sign({
        privateKeys: [privateKey2],
        blob: blobInfo.result.transactionBlob
      })
  
      console.log(signed)
      expect(signed.errorCode).to.equal(0)
  
      let submitted = await sdk.transaction.submit({
        signature: signed.result.signatures,
        blob: blobInfo.result.transactionBlob
      })
  
      console.log(submitted)
      expect(submitted.errorCode).to.equal(0)
  
      let info = null;
      for (let i = 0; i < 10; i++) {
        console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
        info = await sdk.transaction.getInfo(submitted.result.hash)
        if (info.errorCode === 0) {
          break;
        }
        sleep(2000);
      }
  
      expect(info.errorCode).to.equal(0)
      
    })
    

    it("Getting the current committee",async ()=>{
      const data = await sdk.contract.call({
        optType : 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getCommittee"
        })
      })
      expect(data.errorCode).to.equal(0)
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal(`{"committee":["${sourceAddress}"]}`)
    })
    
    // Commitee repeated apply check
    it("ReApplying to become a committee member",async()=>{
      const nonceResult = await sdk.account.getNonce(address2);
  
  
      expect(nonceResult.errorCode).to.equal(0)
  
  
      let nonce = nonceResult.result.nonce;
      nonce = new BigNumber(nonce).plus(1).toString(10);
      console.log(nonce)
  

      let input = {
        "method": "apply",
        "params": {
          "role": "committee",
          "ratio": 0,
          "node": address2
        }
      }
  
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address2,
        gasAmount: '0',
        input: JSON.stringify(input),
      });
  
      
  
      expect(contractInvoke.errorCode).to.equal(0)
  
      const operationItem = contractInvoke.result.operation;
  
      
  
      const args = {
        sourceAddress:address2,
        nonce,
        operations: [operationItem],
      };
  
      let feeData = await sdk.transaction.evaluateFee(args);
  
      // console.log(feeData.result)
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151)
    })
  
    it("Applying for invalid role",async()=>{
      const nonceResult = await sdk.account.getNonce(address3);
  
  
      expect(nonceResult.errorCode).to.equal(0)
  
  
      let nonce = nonceResult.result.nonce;
      nonce = new BigNumber(nonce).plus(1).toString(10);
      console.log(nonce)

      let input = {
        "method": "apply",
        "params": {
          "role": "member",
          "ratio": 0,
          "node": address3
        }
      }
  
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address3,
        gasAmount: '0',
        input: JSON.stringify(input),
      });
  
      console.log(contractInvoke)
  
      expect(contractInvoke.errorCode).to.equal(0)
  
      const operationItem = contractInvoke.result.operation;
  
      console.log(operationItem)
  
      const args = {
        sourceAddress:address3,
        nonce,
        operations: [operationItem],
      };
  
      let feeData = await sdk.transaction.evaluateFee(args);
  
  
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151)
    })
  
    // Done
    it("Successfully retrieving a valid proposal from address2", async () => {
      
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getProposal",
          params: {
            "operate": "apply", 
            "item": "committee", 
            "address": address2 
          } 
        })
      });
      
      console.log(data.result.query_rets[0])
      expect(data.errorCode).to.equal(0);
      
    });
  
    it("Attempting to retrieve a proposal with insufficient permissions from address3", async () => {
      // Assume address3 is not authorized to view proposals as he hasn't submitted any proposal
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getProposal",
          params: {
            "operate": "apply",
            "item": "committee",
            "address": address2 // Assuming address2 has a valid proposal
          }
        }),
        sourceAddress: address3 // Attempting the operation as address3
      });
    
      // Expect the operation to fail due to insufficient permissions
      console.log(data.result.query_rets[0])
      expect(data.errorCode).to.not.equal(151);
    });
  
    it("Attempting to retrieve a proposal for an address that has not submitted one.", async () => {
      // Attempt to retrieve a proposal for an address that has not submitted one.
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getProposal",
          params: {
            "operate": "apply",
            "item": "committee",
            "address": address5 // Using an address that hasn't submitted a proposal
          }
        })
      });
      
        console.log(data.result.query_rets[0])
        expect(data.result.query_rets[0].result.value).to.equal('{"proposal":false}');
    });
    
    it("Attempting to retrieve a proposal with invalid address format", async () => {
      // Attempt to retrieve a proposal using an invalid address format
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getProposal",
          params: {
            "operate": "apply",
            "item": "committee",
            "address": "invalidAddressFormat" // Intentionally invalid address format
          }
        })
      });
    
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal('{"proposal":false}');

    });

    it("Attempting to retrieve a proposal with invalid item parameter", async () => {
      // Attempt to retrieve a proposal using an invalid item format
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getProposal",
          params: {
            "operate": "apply",
            "item": "member",  // Intentionally invalid item format
            "address": address2
          }
        })
      });
    
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal('{"proposal":false}');
    });

    it("Attempting to retrieve a proposal with an valid item format but address2 didn't submit that request", async () => {
      // Attempt to retrieve a proposal using an valid item format but address2 didn't submit that request
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getProposal",
          params: {
            "operate": "apply",
            "item": "KOL", // Intentionally invalid item format that exist but address2 has not submitted that request
            "address": address2 
          }
        })
      });
    
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal('{"proposal":false}');
    });

    it("Attempting to retrieve a proposal with invalid operate functionality", async () => {
      // Attempt to retrieve a proposal using an invalid operate format
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getProposal",
          params: {
            "operate": "approve", // Intentionally invalid operate format
            "item": "KOL",
            "address": address2 
          }
        })
      });
    
      console.log(data.result)
      expect(data.result.query_rets[0].result.value).to.equal('{"proposal":false}');
    });
  
    // Done
    it("Non-committee member attempting to approve a proposal", async () => {
      // Assume `address3` is not a committee member but tries to approve `address2`'s proposal
      const nonceResult = await sdk.account.getNonce(address3); // Non-committee member
      expect(nonceResult.errorCode).to.equal(0);
  
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
  
      let input = {
        "method": "approve",
        "params": {
          "operate": "apply",
          "item": "committee",
          "address": address2
        }
      };
  
      // Invoke the `approve` function on the smart contract
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address3, // Non-committee member
        gasAmount: '0',
        input: JSON.stringify(input),
      });
  
      // Expect the operation to fail due to insufficient permissions
      console.log(contractInvoke.result.operation)
      const operationItem = contractInvoke.result.operation;
  
      expect(contractInvoke.errorCode).to.equal(0);
  
      let feeData = await sdk.transaction.evaluateFee({
        sourceAddress: address3,
        nonce,
        operations: [operationItem],
        signtureNumber: '100',
      });
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151)
    });
    
    it("Attempting to approve a nonexistent proposal", async () => {
      // Assuming no proposal has been made by `address3`
      const nonceResult = await sdk.account.getNonce(sourceAddress);
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "approve",
        "params": {
          "operate": "apply",
          "item": "committee",
          "address": address4 // Address with no submitted proposal
        }
      };
    
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: sourceAddress,
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the operation to fail since the proposal does not exist
      expect(contractInvoke.errorCode).to.equal(0);
  
      const operationItem = contractInvoke.result.operation;
  
      expect(contractInvoke.errorCode).to.equal(0);
  
      let feeData = await sdk.transaction.evaluateFee({
        sourceAddress: sourceAddress,
        nonce,
        operations: [operationItem],
        signtureNumber: '100',
      });
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151)
    });
    
    it("Approving a proposal with invalid operation type", async () => {
      // Assume `address2` made a valid application, but the `operate` parameter is incorrect
      const nonceResult = await sdk.account.getNonce(sourceAddress); // Committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "approve",
        "params": {
          "operate": "invalidOperation", // Intentionally incorrect
          "item": "committee",
          "address": address2
        }
     
      }
  
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: sourceAddress, // Committee member's address
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the operation to succeed
      expect(contractInvoke.errorCode).to.equal(0);
  
      const operationItem = contractInvoke.result.operation;
  
  
      const args = {
        sourceAddress:sourceAddress,
        nonce,
        operations: [operationItem],
      };
  
      let feeData = await sdk.transaction.evaluateFee(args);
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151)
   
    })
     
    it("Approving a proposal with invalid proposal item", async () => {
      // Assume `address2` made a valid application, but the `item` parameter is incorrect
      const nonceResult = await sdk.account.getNonce(sourceAddress); // Committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "approve",
        "params": {
          "operate": "apply", 
          "item": "KOL", // Intentionally incorrect
          "address": address2
        }
     
      }
  
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: sourceAddress, // Committee member's address
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the operation to succeed
      expect(contractInvoke.errorCode).to.equal(0);
  
      const operationItem = contractInvoke.result.operation;
  
      const args = {
        sourceAddress:sourceAddress,
        nonce,
        operations: [operationItem],
      };
  
      let feeData = await sdk.transaction.evaluateFee(args);
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151)
   
    })
   
    it("Approving a proposal with invalid address", async () => {
      // Assume `address2` made a valid application, but the `address` parameter is incorrect
      const nonceResult = await sdk.account.getNonce(sourceAddress); // Committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "approve",
        "params": {
          "operate": "apply", 
          "item": "committee", 
          "address": "invalidAddress" // Intentionally incorrect
        }
      }
  
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: sourceAddress, // Committee member's address
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the operation to succeed
      expect(contractInvoke.errorCode).to.equal(0);
  
      const operationItem = contractInvoke.result.operation;
  
      const args = {
        sourceAddress:sourceAddress,
        nonce,
        operations: [operationItem],
      };
  
      let feeData = await sdk.transaction.evaluateFee(args);
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151)
   
    })
    
    // Done 
    it("Successfully approving a valid proposal by a committee member", async () => {
      // Assume `address2` has made a proposal to become a committee member and is awaiting approval
      const nonceResult = await sdk.account.getNonce(sourceAddress); // sourceAddress is a committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      // Preparing input for approving the proposal
      let input = {
        "method": "approve",
        "params": {
          "operate": "apply",
          "item": "committee",
          "address": address2 // Address whose proposal is being approved
        }
      };
    
      // Invoke the `approve` function on the smart contract
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: sourceAddress, // Committee member's address
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the operation to succeed
      expect(contractInvoke.errorCode).to.equal(0);
      
      const operationItem = contractInvoke.result.operation;
  
      const args = {
        sourceAddress:sourceAddress,
        nonce,
        operations: [operationItem],
      };
  
      let feeData = await sdk.transaction.evaluateFee(args);
      
      expect(feeData.errorCode).to.equal(0)
  
  
      let feeLimit = feeData.result.feeLimit;
      let gasPrice = feeData.result.gasPrice;
  
      const blobInfo = await sdk.transaction.buildBlob({
        sourceAddress: sourceAddress,
        gasPrice: gasPrice,
        feeLimit: feeLimit,
        nonce,
        operations: [operationItem],
        signtureNumber: '1'
      })
  
      expect(blobInfo.errorCode).to.equal(0)
  
  
      const signed = sdk.transaction.sign({
        privateKeys: [privateKey],
        blob: blobInfo.result.transactionBlob
      })
  
      expect(signed.errorCode).to.equal(0)
  
      let submitted = await sdk.transaction.submit({
        signature: signed.result.signatures,
        blob: blobInfo.result.transactionBlob
      })
  
      expect(submitted.errorCode).to.equal(0)
  
  
      let info = null;
      for (let i = 0; i < 10; i++) {
        console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
        info = await sdk.transaction.getInfo(submitted.result.hash)
        if (info.errorCode === 0) {
          break;
        }
        sleep(2000);
      }
  
  
      expect(info.errorCode).to.equal(0)
  
  
    });
  
    // Done
    it("Getting the current committee",async ()=>{
      const data = await sdk.contract.call({
        optType : 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getCommittee"
        })
      })
      expect(data.errorCode).to.equal(0)
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal(`{"committee":["${sourceAddress}","${address2}"]}`)
    })

  })

  describe("Withdraw function testing",async()=>{
    this.timeout(30000);

    it("Getting the current committee",async ()=>{
      const data = await sdk.contract.call({
        optType : 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getCommittee"
        })
      })
      expect(data.errorCode).to.equal(0)
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal(`{"committee":["${sourceAddress}","${address2}"]}`)
    })

    // This one we have to apply 
    it("Non-committee member attempts to withdraw from committee", async () => {
      // Setup: Assume `address3` is not a committee member but tries to withdraw from the committee.
      const nonceResult = await sdk.account.getNonce(address3); // Non-committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "withdraw",
        "params": {
          "role": "committee"
        }
      };
    
      // Invoke the `withdraw` function on the smart contract
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address3, // Attempting the operation as address3
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the contract invocation to proceed without errors (errorCode = 0) since it's just building the operation
      expect(contractInvoke.errorCode).to.equal(0);
      console.log(contractInvoke.result.operation);
      
      // Evaluate the fee for the operation
      const operationItem = contractInvoke.result.operation;
      let feeData = await sdk.transaction.evaluateFee({
        sourceAddress: address3,
        nonce,
        operations: [operationItem],
        signtureNumber: '100',
      });
    
      // Since address3 is not a committee member, expect an error code that indicates the operation would fail when processed
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151); // Assuming errorCode 151 indicates a failed operation due to lack of permissions
    });
    
    // This one we have to apply 
    it("Attempting withdrawal with invalid role type", async () => {
      const nonceResult = await sdk.account.getNonce(address2);
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "withdraw",
        "params": {
          "role": "invalidRoleType"  // 
        }
      };
    
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address2,
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      expect(contractInvoke.errorCode).to.equal(0);
    
      const operationItem = contractInvoke.result.operation;
      
      let feeData = await sdk.transaction.evaluateFee({
        sourceAddress: address2,
        nonce,
        operations: [operationItem],
        signtureNumber: '1',
      });
    
      // Expecting an error due to invalid role type
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151);
      // -------------------------------------------------->
      // Error for applying as invalid role type and rpeviuos it block Non-committee member attempts to withdraw are the same
      // so kindly deffrentiate between them
      // -------------------------------------------------->
    });

    // Done
    it("Committee member successfully withdraws from the committee", async () => {
      const nonceResult = await sdk.account.getNonce(address2); // Assuming address2 is a committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "withdraw",
        "params": {
          "role": "committee"
        }
      };
    
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address2,
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      expect(contractInvoke.errorCode).to.equal(0);
    
      const operationItem = contractInvoke.result.operation;
      
      let feeData = await sdk.transaction.evaluateFee({
        sourceAddress: address2,
        nonce,
        operations: [operationItem],
        signtureNumber: '1',
      });
      console.log(feeData)
      expect(feeData.errorCode).to.equal(0);
      let feeLimit = feeData.result.feeLimit;
      let gasPrice = feeData.result.gasPrice;

      const blobInfo = sdk.transaction.buildBlob({
        sourceAddress: address2,
        nonce,
        gasPrice: gasPrice,
        feeLimit: feeLimit,
        operations: [operationItem],
        signtureNumber: '1',
      });

    console.log(blobInfo);
    expect(blobInfo.errorCode).to.equal(0)

    const signed = sdk.transaction.sign({
      privateKeys: [privateKey2],
      blob: blobInfo.result.transactionBlob
    })

    console.log(signed)
    expect(signed.errorCode).to.equal(0)

    let submitted = await sdk.transaction.submit({
      signature: signed.result.signatures,
      blob: blobInfo.result.transactionBlob
    })

    console.log(submitted)
    expect(submitted.errorCode).to.equal(0)

    let info = null;
    for (let i = 0; i < 10; i++) {
      console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
      info = await sdk.transaction.getInfo(submitted.result.hash)
      if (info.errorCode === 0) {
        break;
      }
      sleep(2000);
    }

    expect(info.errorCode).to.equal(0)
    });
    
    // Done
    it("Getting the current committee",async ()=>{
      const data = await sdk.contract.call({
        optType : 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getCommittee"
        })
      })
      expect(data.errorCode).to.equal(0)
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal(`{"committee":["${sourceAddress}"}`)
    })

  })

  describe("Abolish function testing", async () =>{
      this.timeout(50000)
    
    it("Getting the current committee",async ()=>{
      const data = await sdk.contract.call({
        optType : 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getCommittee"
        })
      })
      expect(data.errorCode).to.equal(0)
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal(`{"committee":["${sourceAddress}","${address2}"]}`)
    })

    it('Applying to become a committee member for address 3', async () =>  {
      const nonceResult = await sdk.account.getNonce(address3);


      expect(nonceResult.errorCode).to.equal(0)


      let nonce = nonceResult.result.nonce;
      nonce = new BigNumber(nonce).plus(1).toString(10);

      let input = {
        "method": "apply",
        "params": {
          "role": "committee",
          "ratio": 0,
          "node": address3
        }
      }

      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address3,
        gasAmount: '0',
        input: JSON.stringify(input),
      });


      expect(contractInvoke.errorCode).to.equal(0)

      const operationItem = contractInvoke.result.operation;
      // expect(operationItem.errorCode).to.equal(0)


      const args = {
        sourceAddress:address3,
        nonce,
        operations: [operationItem],
      };

      let feeData = await sdk.transaction.evaluateFee(args);

      console.log(feeData)
      expect(feeData.errorCode).to.equal(0)

      let feeLimit = feeData.result.feeLimit;
      let gasPrice = feeData.result.gasPrice;

      const blobInfo = sdk.transaction.buildBlob({
        sourceAddress: address3,
        nonce,
        gasPrice: gasPrice,
        feeLimit: feeLimit,
        operations: [operationItem],
        signtureNumber: '1',
      });

      console.log(blobInfo);
      expect(blobInfo.errorCode).to.equal(0)

      const signed = sdk.transaction.sign({
        privateKeys: [privateKey3],
        blob: blobInfo.result.transactionBlob
      })

      console.log(signed)
      expect(signed.errorCode).to.equal(0)

      let submitted = await sdk.transaction.submit({
        signature: signed.result.signatures,
        blob: blobInfo.result.transactionBlob
      })

      console.log(submitted)
      expect(submitted.errorCode).to.equal(0)

      let info = null;
      for (let i = 0; i < 10; i++) {
        console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
        info = await sdk.transaction.getInfo(submitted.result.hash)
        if (info.errorCode === 0) {
          break;
        }
        sleep(2000);
      }

      expect(info.errorCode).to.equal(0)
    })

    it("Non-committee member attempting to abolish a proposal", async () => {
      const nonceResult = await sdk.account.getNonce(address4); // Not a committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "abolish",
        "params": {
          "role": "committee",
          "address": address3,
          "proof": "Attempted unauthorized abolish"
        }
      };
    
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address4, // Attempt by a non-committee member
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expectation: Contract invoke should still succeed but evaluation of fee or execution should fail
      expect(contractInvoke.errorCode).to.equal(0);
    
      const operationItem = contractInvoke.result.operation;
    
      let feeData = await sdk.transaction.evaluateFee({
        sourceAddress: address4,
        nonce,
        operations: [operationItem],
        signtureNumber: '1',
      });
    
      // Expecting an error due to unauthorized action
      console.log(feeData)
      expect(feeData.errorCode).to.equal(151);
    });
    
    it("Attempting to abolish a proposal with an invalid address", async () => {
        const nonceResult = await sdk.account.getNonce(address2); // Committee member
        expect(nonceResult.errorCode).to.equal(0);
      
        let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
      
        let input = {
          "method": "abolish",
          "params": {
            "role": "committee",
            "address": "invalidAddress",
            "proof": "Proof of invalidity"
          }
        };
      
        let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
          contractAddress: contractAddress,
          sourceAddress: address2,
          gasAmount: '0',
          input: JSON.stringify(input),
        });
      
        expect(contractInvoke.errorCode).to.equal(0);
      
        const operationItem = contractInvoke.result.operation;
      
        let feeData = await sdk.transaction.evaluateFee({
          sourceAddress: address2,
          nonce,
          operations: [operationItem],
          signtureNumber: '1',
        });
        console.log(feeData)
        expect(feeData.errorCode).to.equal(151);
    });

    it("Attempting to retrieve a proposal of address3", async () => {
    // Attempt to retrieve a proposal using an invalid address format
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getProposal",
          params: {
            "operate": "apply",
            "item": "committee",
            "address": address3 // Intentionally invalid address format
          }
        })
      });
    
      console.log(data.result.query_rets[0].result)
    // expect(data.result.query_rets[0].result.value).to.equal('{"proposal":false}');

    });

    it("Successfully approving a valid proposal by a committee member", async () => {
      const nonceResult = await sdk.account.getNonce(address2); // address2 is a committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      // Preparing input for approving the proposal
      let input = {
        "method": "approve",
        "params": {
          "operate": "apply",
          "item": "committee",
          "address": address3 // Address whose proposal is being approved
        }
      };
    
      // Invoke the `approve` function on the smart contract
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address2, // Committee member's address
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the operation to succeed
      expect(contractInvoke.errorCode).to.equal(0);
      
      const operationItem = contractInvoke.result.operation;
  
      const args = {
        sourceAddress:address2,
        nonce,
        operations: [operationItem],
      };
  
      let feeData = await sdk.transaction.evaluateFee(args);
      
      expect(feeData.errorCode).to.equal(0)
      console.log(feeData)
  
      let feeLimit = feeData.result.feeLimit;
      let gasPrice = feeData.result.gasPrice;
  
      const blobInfo = await sdk.transaction.buildBlob({
        sourceAddress: address2,
        gasPrice: gasPrice,
        feeLimit: feeLimit,
        nonce,
        operations: [operationItem],
        signtureNumber: '1'
      })
  
      expect(blobInfo.errorCode).to.equal(0)
  
  
      const signed = sdk.transaction.sign({
        privateKeys: [privateKey2],
        blob: blobInfo.result.transactionBlob
      })
  
      expect(signed.errorCode).to.equal(0)
  
      let submitted = await sdk.transaction.submit({
        signature: signed.result.signatures,
        blob: blobInfo.result.transactionBlob
      })
  
      expect(submitted.errorCode).to.equal(0)
  
  
      let info = null;
      for (let i = 0; i < 10; i++) {
        console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
        info = await sdk.transaction.getInfo(submitted.result.hash)
        if (info.errorCode === 0) {
          break;
        }
        sleep(2000);
      }
  
  
      expect(info.errorCode).to.equal(0)
  
  
    });

    it("Committee member successfully abolishes a proposal", async () => {
      const nonceResult = await sdk.account.getNonce(address2); // Committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
      let input = {
        "method": "abolish",
        "params": {
          "role": "committee",
          "address": address3,
          "proof": "Invalid activities detected"
        }
      };
    
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address2, // Committee member
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      expect(contractInvoke.errorCode).to.equal(0);
    
      const operationItem = contractInvoke.result.operation;
    
      let feeData = await sdk.transaction.evaluateFee({
        sourceAddress: address2,
        nonce,
        operations: [operationItem],
        signtureNumber: '1',
      });
      
      console.log(feeData)
      expect(feeData.errorCode).to.equal(0);
    });
    
    it("Attempting to retrieve a proposal of address3", async () => {
      // Attempt to retrieve a proposal using an invalid address format
        const data = await sdk.contract.call({
          optType: 2,
          contractAddress: contractAddress,
          input: JSON.stringify({
            method: "getProposal",
            params: {
              "operate": "apply",
              "item": "committee",
              "address": address3 // Intentionally invalid address format
            }
          })
        });
      
        console.log(data.result.query_rets[0].result)
      // expect(data.result.query_rets[0].result.value).to.equal('{"proposal":false}');
  
    });

    it("Getting the current committee",async ()=>{
      const data = await sdk.contract.call({
        optType : 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getCommittee"
        })
      })
      expect(data.errorCode).to.equal(0)
      console.log(data.result.query_rets[0])
      expect(data.result.query_rets[0].result.value).to.equal(`{"committee":["${sourceAddress}","${address2}"]}`)
    })

  })
  
  describe("Applying for validator",async ()=>{
    this.timeout(50000);
    // Done
    it("Fetching the current list of validators", async () => {
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getValidatorCandidates"
        })
      });
    
      expect(data.errorCode).to.equal(0);
      console.log(data.result.query_rets[0].result.value);

      expect(JSON.parse(data.result.query_rets[0].result.value).validator_candidates[0][0]).to.not.equal(`${address5}`)
    });

    // Done
    it('Applying to become a validator', async () => {
      const nonceResult = await sdk.account.getNonce(address5);
      expect(nonceResult.errorCode).to.equal(0);
  
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
  
      let input = {
        "method": "apply",
        "params": {
          "role": "validator",
          "node": address5
        }
      };
  
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address5,
        gasAmount: '1',
        input: JSON.stringify(input),
      });
      

      expect(contractInvoke.errorCode).to.equal(0);
  
      const operationItem = contractInvoke.result.operation;
        
      let feeData = await sdk.transaction.evaluateFee({
        sourceAddress: address5,
        nonce,
        operations: [operationItem],
        signtureNumber: '1',
      });
      console.log(feeData)
      expect(feeData.errorCode).to.equal(0);

      let feeLimit = feeData.result.feeLimit;
      let gasPrice = feeData.result.gasPrice;

      const blobInfo = sdk.transaction.buildBlob({
        sourceAddress: address5,
        nonce,
        gasPrice: gasPrice,
        feeLimit: feeLimit,
        operations: [operationItem],
        signtureNumber: '1',
      });
  
      console.log(blobInfo);
      expect(blobInfo.errorCode).to.equal(0)
  
      const signed = sdk.transaction.sign({
        privateKeys: [privateKey5],
        blob: blobInfo.result.transactionBlob
      })
  
      console.log(signed)
      expect(signed.errorCode).to.equal(0)
  
      let submitted = await sdk.transaction.submit({
        signature: signed.result.signatures,
        blob: blobInfo.result.transactionBlob
      })
  
      console.log(submitted)
      expect(submitted.errorCode).to.equal(0)
  
      let info = null;
      for (let i = 0; i < 10; i++) {
        console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
        info = await sdk.transaction.getInfo(submitted.result.hash)
        if (info.errorCode === 0) {
          break;
        }
        sleep(2000);
      }
  
      expect(info.errorCode).to.equal(0)
    });

    // Done
    it("Attempting to retrieve a validator proposal of address5", async () => {
        const data = await sdk.contract.call({
          optType: 2,
          contractAddress: contractAddress,
          input: JSON.stringify({
            method: "getProposal",
            params: {
              "operate": "apply",
              "item": "validator",
              "address": address5 
            }
          })
        });
      
        console.log(data.result.query_rets[0].result)
        expect(data.result.query_rets[0].result.value).to.not.equal('{"proposal":false}');
    });

    // Done
    it("Successfully approving a valid validator proposal by a committee member address5 from address2", async () => {
      const nonceResult = await sdk.account.getNonce(address2); // address2 is a committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
     
      let input = {
        "method": "approve",
        "params": {
          "operate": "apply",
          "item": "validator",
          "address": address5 
        }
      };
    
      
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: address2, // Committee member's address
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the operation to succeed
      expect(contractInvoke.errorCode).to.equal(0);
      
      const operationItem = contractInvoke.result.operation;

      const args = {
        sourceAddress:address2,
        nonce,
        operations: [operationItem],
      };

      let feeData = await sdk.transaction.evaluateFee(args);
      
      console.log(feeData)
      expect(feeData.errorCode).to.equal(0)

      let feeLimit = feeData.result.feeLimit;
      let gasPrice = feeData.result.gasPrice;

      const blobInfo = await sdk.transaction.buildBlob({
        sourceAddress: address2,
        gasPrice: gasPrice,
        feeLimit: feeLimit,
        nonce,
        operations: [operationItem],
        signtureNumber: '1'
      })

      expect(blobInfo.errorCode).to.equal(0)


      const signed = sdk.transaction.sign({
        privateKeys: [privateKey2],
        blob: blobInfo.result.transactionBlob
      })

      expect(signed.errorCode).to.equal(0)

      let submitted = await sdk.transaction.submit({
        signature: signed.result.signatures,
        blob: blobInfo.result.transactionBlob
      })

      expect(submitted.errorCode).to.equal(0)


      let info = null;
      for (let i = 0; i < 10; i++) {
        console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
        info = await sdk.transaction.getInfo(submitted.result.hash)
        if (info.errorCode === 0) {
          break;
        }
        sleep(2000);
      }


      expect(info.errorCode).to.equal(0)


    });

    // Done
    it("Successfully approving a valid validator proposal by a committee member address5 from source address", async () => {
      const nonceResult = await sdk.account.getNonce(sourceAddress); // sourceAddress is a committee member
      expect(nonceResult.errorCode).to.equal(0);
    
      let nonce = new BigNumber(nonceResult.result.nonce).plus(1).toString(10);
    
     
      let input = {
        "method": "approve",
        "params": {
          "operate": "apply",
          "item": "validator",
          "address": address5 
        }
      };
    
      
      let contractInvoke = await sdk.operation.contractInvokeByGasOperation({
        contractAddress: contractAddress,
        sourceAddress: sourceAddress, // Committee member's address
        gasAmount: '0',
        input: JSON.stringify(input),
      });
    
      // Expect the operation to succeed
      expect(contractInvoke.errorCode).to.equal(0);
      
      const operationItem = contractInvoke.result.operation;

      const args = {
        sourceAddress:sourceAddress,
        nonce,
        operations: [operationItem],
      };

      let feeData = await sdk.transaction.evaluateFee(args);
      
      console.log(feeData)
      expect(feeData.errorCode).to.equal(0)

      let feeLimit = feeData.result.feeLimit;
      let gasPrice = feeData.result.gasPrice;

      const blobInfo = await sdk.transaction.buildBlob({
        sourceAddress: sourceAddress,
        gasPrice: gasPrice,
        feeLimit: feeLimit,
        nonce,
        operations: [operationItem],
        signtureNumber: '1'
      })

      expect(blobInfo.errorCode).to.equal(0)


      const signed = sdk.transaction.sign({
        privateKeys: [privateKey],
        blob: blobInfo.result.transactionBlob
      })

      expect(signed.errorCode).to.equal(0)

      let submitted = await sdk.transaction.submit({
        signature: signed.result.signatures,
        blob: blobInfo.result.transactionBlob
      })

      expect(submitted.errorCode).to.equal(0)


      let info = null;
      for (let i = 0; i < 10; i++) {
        console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
        info = await sdk.transaction.getInfo(submitted.result.hash)
        if (info.errorCode === 0) {
          break;
        }
        sleep(2000);
      }


      expect(info.errorCode).to.equal(0)


    });

    // Done
    it("Fetching the current list of validators after approval", async () => {
      const data = await sdk.contract.call({
        optType: 2,
        contractAddress: contractAddress,
        input: JSON.stringify({
          method: "getValidatorCandidates"
        })
      });
    
      expect(data.errorCode).to.equal(0);
      console.log(data.result.query_rets[0].result.value);

      expect(JSON.parse(data.result.query_rets[0].result.value).validator_candidates[0][0]).to.equal(`${address5}`)
    });


  });

})



// describe("Extract and Extract Transfer function testing",async  ()=>{
// })









    // let feeData = await sdk.transaction.evaluateFee({
    //   sourceAddress:address2,
    //   nonce,
    //   operations: [operationItem]
    // });
    // console.log(feeData)
    // expect(feeData.errorCode).to.equal(0)

    // let feeLimit = feeData.result.feeLimit;
    // let gasPrice = feeData.result.gasPrice;

    // console.log("gasPrice", gasPrice);
    // console.log("feeLimit", feeLimit);

    // const blobInfo = sdk.transaction.buildBlob({
    //   sourceAddress: address2,
    //   nonce,
    //   gasPrice: gasPrice,
    //   feeLimit: feeLimit,
    //   operations: [operationItem],
    //   signtureNumber: '1',
    // });

    // console.log(blobInfo);
    // expect(blobInfo.errorCode).to.equal(0)

    // const signed = sdk.transaction.sign({
    //   privateKeys: [privateKey2],
    //   blob: blobInfo.result.transactionBlob
    // })

    // console.log(signed)
    // expect(signed.errorCode).to.equal(0)

    // let submitted = await sdk.transaction.submit({
    //   signature: signed.result.signatures,
    //   blob: blobInfo.result.transactionBlob
    // })

    // console.log(submitted)
    // expect(submitted.errorCode).to.equal(0)

    // let info = null;
    // for (let i = 0; i < 10; i++) {
    //   console.log("Getting the transaction history (attempt " + (i + 1).toString() + ")...")
    //   info = await sdk.transaction.getInfo(submitted.result.hash)
    //   if (info.errorCode === 0) {
    //     break;
    //   }
    //   sleep(2000);
    // }

    // expect(info.errorCode).to.equal(0)







