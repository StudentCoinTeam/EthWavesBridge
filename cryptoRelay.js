const { create } = require("@waves/node-api-js")
const fs = require("fs-extra")
const sendStudentCoin = require("./lib/sendStudentCoin.js")
const base58 = require("base-58")

process.on("unhandledRejection", (reason, p) => {
    console.error('Unhandled Rejection Occured')
    console.error("Reason: ", reason)
    console.error("Promise: ", p)
})

const main = async() => {

    let sendingError
    let wavesIDError
    let walletBalanceError
    let config

    if (!await fs.exists("./config.json")) {
        console.log("File config.json doesn't exist.")
        process.exit()
    } else {
        config = JSON.parse(await fs.readFile("./config.json", "utf-8"))
    }
    const { wavesAddress, infuraUrl, myAddress, privateKey } = config

    const wavesUrl = "https://nodes.wavesnodes.com";
    const api = create(wavesUrl);
    const wavesTx = await api.transactions.fetchTransactions(wavesAddress, 1000)
    
    if (!await fs.exists("./lastTransactions.json")) {
        await fs.writeFile("./lastTransactions.json", JSON.stringify(wavesTx.map(tx => tx.id)), "utf-8")
        console.log("File lastTransactions.json not found, creating lastTransactions.json as actual waves transaction status and close.")
        process.exit()
    }
    
    const sentTx = JSON.parse(await fs.readFile("./lastTransactions.json", "utf-8"))
    let toSendTx = wavesTx.filter(tx => !sentTx.includes(tx.id))

    for (let tx of toSendTx) {
        console.log("Transaction", toSendTx.indexOf(tx) + 1, "of", toSendTx.length)
        
        const toAddress = new Buffer.from(base58.decode(tx.attachment)).toString()
        const amount = tx.amount

        if (tx.amount <= 0 || !web3Utils.checkAddressChecksum(toAddress)) {
            wavesIDError++
            toSendTx[toSendTx.indexOf(tx)] = null
            console.error("isSent:", false)
            console.error("Reason:", "Bad attachment address at waves ID: ", tx.id, "at sending", amount/100, "STC to", toAddress)
            continue
        }

        console.log("Sending", amount/100, "STC to", toAddress)
        let response = await sendStudentCoin(myAddress, privateKey, amount, toAddress, infuraUrl);

        if (!await fs.exists("./transactions")) await fs.mkdir("./transactions")
        console.log("isSent: ", response.status)
        
        if (response.status) {
            await fs.writeFile(`./transactions/${txCount + "_" + (new Date(Date.now())).toISOString().split("T")[0]}.json`, JSON.stringify(response.transactionInfo), "utf-8")
        } else {
            if (transactionInfo.message.includes("Insufficient ETH")) {
                walletBalanceError++
                console.error(transactionInfo.message)
                console.error("Not enough ETH for gas!!!")
                console.error("Wallet ETH balance:", transactionInfo.ETHBalance, "ETH")
                console.log("Process exited.")
                process.exit()

            }
            if (transactionInfo.message.includes("Insufficient STC")) {
                walletBalanceError++
                console.error(transactionInfo.message)
                console.error("myAddressBalance: ", transactionInfo.STCBalance, "STC")
                console.error("At wavesTransactionID: ", tx.id, "| Amount to send:", transactionInfo.amount/100)
            } else {
                sendingError++
            }

            console.error("Transaction not sent. Reason ", transactionInfo.message)
            toSendTx[toSendTx.indexOf(tx)] = null

            await fs.writeFile(`./transactions/${"-" + txCount + "_" + (new Date(Date.now())).toISOString().split("T")[0]}.json`, JSON.stringify(response.transactionInfo), "utf-8")
        }
 
    }

    toSendTx = toSendTx.filter(tx => !!tx)
    toSendTx.map(tx => sentTx.push(tx.id))
    await fs.writeFile("./lastTransactions.json", JSON.stringify(sentTx), "utf-8")

    console.log("End of script.")
    console.error("Errors at wavesTransactions: ", wavesTransactionError)
    console.log("Internal sending errors:", sendingError)
    console.error("Insufficient balance errors: ", walletBalanceError)
}

main()