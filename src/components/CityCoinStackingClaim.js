import React, { useEffect, useRef, useState } from 'react';
import { useConnect } from '@stacks/connect-react';
import {
  CONTRACT_DEPLOYER,
  CITYCOIN_CORE,
  CITYCOIN_TOKEN,
  CITYCOIN_NAME,
  NETWORK,
  REWARD_CYCLE_LENGTH,
} from '../lib/constants';
import {
  uintCV,
  PostConditionMode,
  makeContractSTXPostCondition,
  makeContractFungiblePostCondition,
  createAssetInfo,
  FungibleConditionCode,
  AnchorMode,
} from '@stacks/transactions';
import {
  getStackingState,
  getFirstStackingBlock,
  getAvailableRewards,
  getRegisteredMinerId,
  getStackingRewards,
} from '../lib/citycoin';
import { CurrentBlockHeight } from './CurrentBlockHeight';
import { CurrentRewardCycle } from './CurrentRewardCycle';
import { TxStatus } from './TxStatus';

export function CityCoinStackingClaim({ ownerStxAddress }) {
  const [loading, setLoading] = useState();
  const [txId, setTxId] = useState();
  const [stackingState, setStackingState] = useState();
  const [stackingRewards, setStackingRewards] = useState();
  const { doContractCall } = useConnect();
  const rewardCycleToClaim = useRef();
  const rewardCycle = 1; //temporary fix

  useEffect(() => {
    ownerStxAddress &&
      getStackingRewards(ownerStxAddress, rewardCycle).then(result => {
        setStackingRewards(result);
      });
  }, [ownerStxAddress]);

  //const checkCycle = async (stxAddress, cycleId) => {
  //  getStackingRewards(stxAddress, cycleId).then(result => {
  //    setStackingRewards(result);
  //    console.log(`result on page: ${JSON.stringify(result)}`);
  //  });
  //};

  const claimAction = async () => {
    const targetRewardCycleCV = uintCV(rewardCycle);
    const amountUstxCV = uintCV(stackingRewards.amountStx);
    const amountCityCoinCV = uintCV(stackingRewards.amountCityCoin);
    setLoading(true);
    let postConditions = [];
    amountUstxCV.value > 0 &&
      postConditions.push(
        makeContractSTXPostCondition(
          CONTRACT_DEPLOYER,
          CITYCOIN_CORE,
          FungibleConditionCode.Equal,
          amountUstxCV.value
        )
      );
    amountCityCoinCV.value > 0 &&
      postConditions.push(
        makeContractFungiblePostCondition(
          CONTRACT_DEPLOYER,
          CITYCOIN_CORE,
          FungibleConditionCode.Equal,
          amountCityCoinCV.value,
          createAssetInfo(CONTRACT_DEPLOYER, CITYCOIN_TOKEN, CITYCOIN_NAME)
        )
      );
    console.log(`postConditions: ${JSON.stringify(postConditions.length)}`);
    await doContractCall({
      contractAddress: CONTRACT_DEPLOYER,
      contractName: CITYCOIN_CORE,
      functionName: 'claim-stacking-reward',
      functionArgs: [targetRewardCycleCV],
      postConditionMode: PostConditionMode.Deny,
      postConditions: postConditions,
      network: NETWORK,
      onCancel: () => {
        setLoading(false);
      },
      onFinish: result => {
        setLoading(false);
      },
    });
  };

  // TODO: add txstatus back to correlate with each claim button state

  return (
    <>
      <h3>Claim Stacking Rewards</h3>
      <CurrentBlockHeight />
      <CurrentRewardCycle />
      <div className="my-2">
        <p>Stacking rewards can be claimed after each cycle ends.</p>
      </div>
      {stackingRewards ? (
        <div className="card m-2 col-lg-6">
          <div className="card-header">
            <h4>Cycle {stackingRewards.cycleId} Results</h4>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-lg-6">Amount Stacked</div>
              <div className="col-lg-6">{stackingRewards.amountStacked.toLocaleString()} MIA</div>
            </div>
            <div className="row">
              <div className="col-lg-6">STX Rewards</div>
              <div className="col-lg-6">
                {(stackingRewards.amountStx / 1000000).toLocaleString()} STX
              </div>
            </div>
            <div className="row">
              <div className="col-lg-6">CityCoins to Claim</div>
              <div className="col-lg-6">{stackingRewards.amountCityCoin.toLocaleString()} MIA</div>
            </div>

            {stackingRewards.amountStx > 0 || stackingRewards.amountCityCoin > 0 ? (
              <>
                <button
                  className="btn btn-block btn-primary my-3"
                  type="button"
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
                <br />
                {txId && <TxStatus txId={txId} />}
              </>
            ) : (
              <>
                <p className="mt-3">Nothing to claim.</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-3">Loading...</div>
      )}
    </>
  );
}

/*
{stackingState && stackingState.length > 0 ? (
        <>
          <div className="accordion accordion-flush" id="accordionExample">
            <div className="accordion-item">
              <h2 className="accordion-header" id="headingOne">
                <button
                  className="accordion-button"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#collapseOne"
                  aria-expanded="true"
                  aria-controls="collapseOne"
                >
                  Reward Cycle #3
                </button>
              </h2>
              <div
                id="collapseOne"
                className="accordion-collapse collapse show"
                aria-labelledby="headingOne"
                data-bs-parent="#accordionExample"
              >
                <div className="accordion-body">
                  <strong>This is the first item's accordion body.</strong> It is shown by default,
                  until the collapse plugin adds the appropriate classes that we use to style each
                  element. These classes control the overall appearance, as well as the showing and
                  hiding via CSS transitions. You can modify any of this with custom CSS or
                  overriding our default variables. It's also worth noting that just about any HTML
                  can go within the <code>.accordion-body</code>, though the transition does limit
                  overflow.
                </div>
              </div>
            </div>
            <div className="accordion-item">
              <h2 className="accordion-header" id="headingTwo">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#collapseTwo"
                  aria-expanded="false"
                  aria-controls="collapseTwo"
                >
                  Reward Cycle #2
                </button>
              </h2>
              <div
                id="collapseTwo"
                className="accordion-collapse collapse"
                aria-labelledby="headingTwo"
                data-bs-parent="#accordionExample"
              >
                <div className="accordion-body">
                  <strong>This is the second item's accordion body.</strong> It is hidden by
                  default, until the collapse plugin adds the appropriate classes that we use to
                  style each element. These classes control the overall appearance, as well as the
                  showing and hiding via CSS transitions. You can modify any of this with custom CSS
                  or overriding our default variables. It's also worth noting that just about any
                  HTML can go within the <code>.accordion-body</code>, though the transition does
                  limit overflow.
                </div>
              </div>
            </div>
            <div className="accordion-item">
              <h2 className="accordion-header" id="headingThree">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#collapseThree"
                  aria-expanded="false"
                  aria-controls="collapseThree"
                >
                  Reward Cycle #1
                </button>
              </h2>
              <div
                id="collapseThree"
                className="accordion-collapse collapse"
                aria-labelledby="headingThree"
                data-bs-parent="#accordionExample"
              >
                <div className="accordion-body">
                  <strong>This is the third item's accordion body.</strong> It is hidden by default,
                  until the collapse plugin adds the appropriate classes that we use to style each
                  element. These classes control the overall appearance, as well as the showing and
                  hiding via CSS transitions. You can modify any of this with custom CSS or
                  overriding our default variables. It's also worth noting that just about any HTML
                  can go within the <code>.accordion-body</code>, though the transition does limit
                  overflow.
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            {stackingState.map((details, key) => (
              <div className="col-3 card" key={key}>
                <div className="card-header">Cycle {details.cycleId}</div>
                <div className="card-body">
                  <p>{(details.amountSTX / 1000000).toLocaleString()} STX</p>
                  <p>{details.amountCC.toLocaleString()} CityCoins</p>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() =>
                      claimAction(
                        uintCV(details.cycleId),
                        uintCV(details.amountSTX),
                        uintCV(details.amountCC)
                      )
                    }
                  >
                    Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : loading ? null : 
*/
