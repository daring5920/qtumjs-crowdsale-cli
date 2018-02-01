const { Qtum } = require("qtumjs")

const repoData = require("./solar.development.json")

const qtum = new Qtum("http://qtum:test@localhost:3889", repoData)

const mytoken = qtum.contract("MyToken")
const crowdsale = qtum.contract("Crowdsale")
const finalizeAgent = qtum.contract("FinalizeAgent")

const nullAddress = "0000000000000000000000000000000000000000" // i.e. 0x0

/**
 * Return the current state of the crowdsale
 *
 * - Preparing: All contract initialization calls and variables have not been set yet
 * - Prefunding: We have not passed start time yet
 * - Funding: Active crowdsale
 * - Success: Minimum funding goal reached
 * - Failure: Minimum funding goal not reached before ending time
 * - Finalized: The finalized has been called and succesfully executed
 * - Refunding: Refunds are loaded on the contract for reclaim
 *
 * @param state {number} the state of a crowdsale, as number
 * @returns string the string name of state
 */
function stateName(state) {
  const stateNames = [
    "Unknown", "Preparing", "PreFunding", "Funding", "Success", "Failure", "Finalized", "Refunding"
  ]

  return stateNames[state]
}

async function showinfo() {
  console.log("token supply:", await mytoken.return("totalSupply"))
  console.log("crowdsale state:", await crowdsale.returnAs(stateName, "getState"))
  console.log("crowdsale start date:", await crowdsale.returnDate("startsAt"))
  console.log("crowdsale end date:", await crowdsale.returnDate("endsAt"))
  console.log("qtum raised:", await crowdsale.returnCurrency("qtum", "weiRaised"))
  console.log("tokens sold:", await crowdsale.return("tokensSold"))

  console.log(`
The crowdsale state returned by callcontract may not reflect the actual state because
block.timestamp is always 0 when calling a contract. This will be fixed in Issue #480.

See https://github.com/qtumproject/qtum/issues/480
`)

}

/**
 * Configure crowdsale to make it ready for funding
 */
async function setupCrowdsale() {
  // set finalize agent as token's release agent
  if (await mytoken.return("releaseAgent") !== finalizeAgent.address) {
    let tx = await mytoken.send("setReleaseAgent", [finalizeAgent.address])
    console.log("confirming mytoken.setReleaseAgent:", tx.txid)
    let receipt = await tx.confirm(1)
    console.log("mytoken.setReleaseAgent receipt", receipt)
  }

  // set crowdsale's finalize agent
  if (await crowdsale.return("finalizeAgent") === nullAddress) {
    tx = await crowdsale.send("setFinalizeAgent", [finalizeAgent.address])
    console.log("confirming crowdsale.setFinalizeAgent:", tx.txid)
    receipt = await tx.confirm(1)
    console.log("crowdsale.setFinalizeAgent receipt", receipt)
  }

  // The mint agent of the token should be the crowdsale contract.
  // `true` means this address is allow to mint. `false` to disable a mint agent.
  if (await mytoken.return("mintAgents", [crowdsale.address]) !== true) {
    tx = await mytoken.send("setMintAgent", [crowdsale.address, true])
    console.log("confirming mytoken.setMintAgent:", tx.txid)
    receipt = await tx.confirm(1)
    console.log("mytoken.setMintAgent receipt", receipt)
  }
}

async function main() {
  const argv = process.argv.slice(2)

  const cmd = argv[0]

  if (process.env.DEBUG) {
    console.log("argv", argv)
    console.log("cmd", cmd)
  }

  switch (cmd) {
    case "info":
      await showinfo()
      break
    default:
      console.log("unrecognized command", cmd)
  }
}

main().catch((err) => {
  console.log("err", err)
})
