import React, { useRef, useState } from 'react';
import { useConnect } from '@stacks/connect-react';
import { CONTRACT_DEPLOYER, CITYCOIN_CORE, NETWORK } from '../lib/constants';
import { uintCV, callReadOnlyFunction, cvToJSON, standardPrincipalCV } from '@stacks/transactions';
import { CurrentBlockHeight } from './CurrentBlockHeight';
import { TxStatus } from './TxStatus';

export function CityCoinMiningClaim({ ownerStxAddress }) {
  const [loading, setLoading] = useState();
  const [canClaim, setCanClaim] = useState(false);
  const [txId, setTxId] = useState();
  const { doContractCall } = useConnect();
  const blockHeightToCheck = useRef();
  const blockHeightResponse = document.getElementById('blockHeightResponse');

  const canClaimRewards = claimValue => {
    return claimValue ? setCanClaim(true) : setCanClaim(false);
  };

  const claimAction = async () => {
    setLoading(true);
    await doContractCall({
      contractAddress: CONTRACT_DEPLOYER,
      contractName: CITYCOIN_CORE,
      functionName: 'claim-mining-reward',
      functionArgs: [uintCV(blockHeightToCheck.current.value)],
      network: NETWORK,
      onCancel: () => {
        setLoading(false);
      },
      onFinish: result => {
        setLoading(false);
        setTxId(result.txId);
      },
    });
  };

  const checkStats = async => {
    // read-only call for get-mining-stats-at-block
    if (blockHeightToCheck.current.value === '') {
      blockHeightResponse.innerHTML = 'Block Height Required!';
    } else {
      blockHeightResponse.innerHTML = 'Loading...';
      callReadOnlyFunction({
        contractAddress: CONTRACT_DEPLOYER,
        contractName: CITYCOIN_CORE,
        functionName: 'get-mining-stats-at-block',
        functionArgs: [uintCV(blockHeightToCheck.current.value)],
        network: NETWORK,
        senderAddress: CONTRACT_DEPLOYER,
      }).then(stats => {
        const totalAmountUstx = cvToJSON(stats.value.data.amount).value;
        const totalAmountStx = totalAmountUstx / 1000000;
        const totalAmountToCity = cvToJSON(stats.value.data.amountToCity).value / 1000000;
        const totalAmountToStackers = cvToJSON(stats.value.data.amountToStackers).value / 1000000;
        const totalMiners = cvToJSON(stats.value.data.minersCount).value;
        const rewardClaimed = cvToJSON(stats.value.data.rewardClaimed).value;
        const response = `
          <div class="row">
            <div class="col-12 fs-6 fw-bold">Mining Stats At Block ${blockHeightToCheck.current.value}</div>
          </div>
          <div class="row">
            <div class="col-2">Total uSTX:</div>
            <div class="col-2">${totalAmountUstx}</div>
          </div>
          <div class="row">
            <div class="col-2">Total STX:</div>
            <div class="col-2">${totalAmountStx}</div>
          </div>
          <div class="row">
            <div class="col-2">Amount to City:</div>
            <div class="col-2">${totalAmountToCity}</div>
          </div>
          <div class="row">
            <div class="col-2">Amount to Stackers:</div>
            <div class="col-2">${totalAmountToStackers}</div>
          </div>
          <div class="row">
            <div class="col-2">Total Miners:</div>
            <div class="col-2">${totalMiners}</div>
          </div>
          <div class="row">
            <div class="col-2">Reward Claimed:</div>
            <div class="col-2">${rewardClaimed}</div>
          </div>
          `;
        blockHeightResponse.innerHTML = response;
      });
    }
  };

  const checkWinner = async => {
    let winner = false;
    // read-only call for is-block-winner
    if (blockHeightToCheck.current.value === '') {
      blockHeightResponse.innerHTML = 'Block Height Required!';
      // } else if ((blockHeightToCheck.current.value) ) {
      //   blockHeightResponse.innerHTML = 'Too soon! Please wait for 100 blocks to pass.';
    } else {
      blockHeightResponse.innerHTML = 'Loading...';
      callReadOnlyFunction({
        contractAddress: CONTRACT_DEPLOYER,
        contractName: CITYCOIN_CORE,
        functionName: 'is-block-winner',
        functionArgs: [
          standardPrincipalCV(ownerStxAddress),
          uintCV(blockHeightToCheck.current.value),
        ],
        network: NETWORK,
        senderAddress: CONTRACT_DEPLOYER,
      }).then(stats => {
        winner = cvToJSON(stats).value;
        var response = `
        <div class="row">
          <div class="col-12 fs-6 fw-bold">Winner at Block ${blockHeightToCheck.current.value}</div>
        </div>
        <div class="row">
            <div class="col-2">Winner?</div>
            <div class="col-2">${winner}</div>
        </div>`;
        callReadOnlyFunction({
          contractAddress: CONTRACT_DEPLOYER,
          contractName: CITYCOIN_CORE,
          functionName: 'can-claim-mining-reward',
          functionArgs: [
            standardPrincipalCV(ownerStxAddress),
            uintCV(blockHeightToCheck.current.value),
          ],
          network: NETWORK,
          senderAddress: CONTRACT_DEPLOYER,
        }).then(claim => {
          let canClaimReward = cvToJSON(claim).value;
          console.log(`canClaimReward: ${canClaimReward}`);
          if (canClaimReward) {
            response =
              response +
              `<div class="row">
                <div class="col-2">Claimed?</div>
                <div class="col-2">${!canClaimReward}</div>
              </div>`;
          } else {
            if (winner) {
              response =
                response +
                `<div class="row">
                  <div class="col-2">Claimed?</div>
                  <div class="col-2">Already Claimed!</div>
                </div>`;
            }
          }
          blockHeightResponse.innerHTML = response;
          return canClaimRewards(canClaimReward);
        });
      });
    }
  };

  return (
    <>
      <h3>Claim Mining Rewards</h3>
      <CurrentBlockHeight />
      <div className="mb-3">
        <div className="form-floating">
          <input
            className="form-control"
            placeholder="Block Height?"
            id="blockHeightToCheck"
            ref={blockHeightToCheck}
          />
          <label htmlFor="blockHeightToCheck">Block Height?</label>
        </div>
        <button className="btn btn-block btn-primary my-3 me-3" type="button" onClick={checkStats}>
          Get Mining Stats
        </button>
        <button className="btn btn-block btn-primary my-3 me-3" type="button" onClick={checkWinner}>
          Check if Winner
        </button>
        <button
          className="btn btn-block btn-primary my-3"
          type="button"
          disabled={!canClaim}
          onClick={claimAction}
        >
          <div
            role="status"
            className={`${
              loading ? '' : 'd-none'
            } spinner-border spinner-border-sm text-info align-text-top ms-1 me-2`}
          />
          Claim Rewards
        </button>
        <div id="blockHeightResponse"></div>
        <br />
        {txId && <TxStatus txId={txId} />}
      </div>
    </>
  );
}
