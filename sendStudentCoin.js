const Web3 = require("web3")
const Tx = require('ethereumjs-tx').Transaction
const fs = require("fs-extra")

//https://stackoverflow.com/questions/48180941/send-erc20-token-with-web3

process.on("unhandledRejection", (reason, p) =>{
    console.error('Unhandled Rejection Occured')
    console.error("Reason: ", reason)
    console.error("Promise: ", p)
})

const sendSigned = async (txData, privateKey, web3) => {
    const privKey = new Buffer.from(privateKey, 'hex')
    const transaction = new Tx(txData)
    await transaction.sign(privKey)
    const serializedTx = await transaction.serialize().toString('hex')
    const response = await web3.eth.sendSignedTransaction('0x' + serializedTx)
    return response
}

const sendStudentCoin = async (myAddress, privateKey, amount, toAddress, infuraUrl) => {
    let response
    const provider = new Web3.providers.HttpProvider(infuraUrl)
    const web3 = new Web3(provider)

    const contractAddress = "test"
    const abiArray = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"sender","type":"address"},{"name":"recipient","type":"address"},{"name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"account","type":"address"},{"name":"amount","type":"uint256"}],"name":"mint","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"value","type":"uint256"}],"name":"burn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"account","type":"address"}],"name":"addMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"recipient","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"isMinter","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newMinter","type":"address"}],"name":"transferMinterRole","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"name","type":"string"},{"name":"symbol","type":"string"},{"name":"decimals","type":"uint8"},{"name":"initialSupply","type":"uint256"},{"name":"feeReceiver","type":"address"},{"name":"tokenOwnerAddress","type":"address"}],"payable":true,"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"MinterAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"MinterRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"}]

    let ETHBalance = await web3.eth.getBalance(myAddress)
    console.log("myAddress ETH:", web3.utils.fromWei(ETHBalance), "ETH")
    const gasPrice = (await web3.eth.getGasPrice()) * 1.08
    const gasLimit = 100 * 1e3

    console.log("Gas limit:", gasLimit)
    console.log("Gas price:", gasPrice)

    let txCount = await web3.eth.getTransactionCount(myAddress)
    console.log("Numer transakcji:", txCount)

    const contract = await new web3.eth.Contract(abiArray, contractAddress, {from: myAddress})
    let STCBalance = await contract.methods.balanceOf(myAddress).call()
    console.log("myAddress STC:", STCBalance, "STC")

    
    if (ETHBalance < 0.002) return { status: false, transactionInfo: { message: "Insufficient ETH balance.", ETHBalance, STCBalance, transactionId: txCount } }
    if (STCBalance < amount) return { status: false, transactionInfo: { message: "Insufficient STC balance.", ETHBalance, STCBalance, amount, transactionId: txCount } }

    const txData = {
        nonce: web3.utils.toHex(txCount),
        gasPrice: web3.utils.toHex(gasPrice), // Gwei
        gasLimit: web3.utils.toHex(gasLimit),
        from: myAddress,
        to: contractAddress,
        value: "0x0",
        data: await contract.methods.transfer(toAddress, amount).encodeABI()
    }

    const start = moment.now()

    let transactionInfo
    try {
        transactionInfo = await sendSigned(txData, privateKey, web3)
        transactionInfo.date = new Date(Date.now()).toISOString()
        transactionInfo.transactionNumber = txCount;
    } catch (err) {
        transactionInfo = {}
        transactionInfo.status = false
        transactionInfo.errorMessage = err
    }
    
    const sentInSeconds = moment().diff(start, "seconds")
    transactionInfo.sentInSeconds = sentInSeconds

    if (transactionInfo.status) {
        return { status: true, transactionInfo }
    } else {
        transactionInfo.message = "Internal sending error"
        return { status: false, transactionInfo }
    }
}

module.exports = sendStudentCoin