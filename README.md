# Zetrix Development Tool


### ENV file creation

Create dotenv file and fill in the zetrix address, private key and node url information

```
ZTX_ADDRESS=ZTX3KYJ7V3xyqox7yXAYxoiZ7DE8QdbbbXE1T
PRIVATE_KEY=privBx2Z16Fxioo2MzzpJqmfP6kVSeWtZZDYoXpL8ocdaYX3vzdaetdX
NODE_URL=52.81.215.222:19333
```

### Install dependencies

Install all related dependencies. 

```
npm install

```

In case of having error during installation, please check the node version. Current validated node / npm version is as follows (in linux pc, windows might use different version):

```
node = v16.14.0
npm = 8.3.1

```


### Contract development

The contract script can be depicted in the following directory **contracts/base.js**. You can change the filename accordingly. In case of changing the filename, please modify the contract name in **scripts/01_deploy.js** as well.


### Contract deployment

For contract deployment, run the following script.

```
npm run deploy
```


### Run test

To run the test, please execute below command. Modify the **contractAddress** and **input** variable accordingly.

```
npm test tests/test-01.js
```

