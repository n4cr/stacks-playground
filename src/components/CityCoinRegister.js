import React, { useEffect, useRef, useState } from 'react';
import { useConnect } from '@stacks/connect-react';
import { CONTRACT_DEPLOYER, CITYCOIN_CORE, NETWORK } from '../lib/constants';
import { TxStatus } from './TxStatus';
import { CurrentBlockHeight } from './CurrentBlockHeight';
import {
  getRegisteredMinerId,
  getRegisteredMinerCount,
  getRegisteredMinersThreshold,
  getMiningActivationStatus,
  getMiningActivationBlockHeight,
} from '../lib/citycoin';
import { someCV, noneCV, stringUtf8CV } from '@stacks/transactions';

export function CityCoinRegister({ ownerStxAddress }) {
  const minerMemoRef = useRef();
  const [minerCount, setMinerCount] = useState();
  const [minerId, setMinerId] = useState(null);
  const [minerRegistered, setMinerRegistered] = useState(false);
  const [minerThreshold, setMinerThreshold] = useState(1);
  const [activationStatus, setActivationStatus] = useState(false);
  const [activationBlockHeight, setActivationBlockHeight] = useState();
  const [txId, setTxId] = useState();
  const [loading, setLoading] = useState();
  const { doContractCall } = useConnect();

  const styles = {
    width: `${(minerCount / minerThreshold) * 100}%`,
  };

  useEffect(() => {
    getRegisteredMinerCount()
      .then(result => {
        setMinerCount(result);
      })
      .catch(e => {
        setMinerCount(0);
        console.log(e);
      });
    getRegisteredMinersThreshold()
      .then(result => {
        setMinerThreshold(result);
      })
      .catch(e => {
        setMinerThreshold(5);
        console.log(e);
      });
    getMiningActivationStatus()
      .then(result => {
        setActivationStatus(result);
        result &&
          getMiningActivationBlockHeight()
            .then(result => {
              setActivationBlockHeight(result);
            })
            .catch(e => {
              console.log(e);
            });
      })
      .catch(e => {
        console.log(e);
      });
  }, []);

  useEffect(() => {
    ownerStxAddress &&
      getRegisteredMinerId(ownerStxAddress)
        .then(result => {
          if (result) {
            setMinerId(result);
            setMinerRegistered(true);
          }
        })
        .catch(e => {
          console.log(e);
        });
  }, [ownerStxAddress]);

  const registerAction = async () => {
    setLoading(true);
    const memo =
      minerMemoRef.current.value == '' ? '' : stringUtf8CV(minerMemoRef.current.value.trim());
    const minerMemoCV = memo ? someCV(memo) : noneCV();
    await doContractCall({
      contractAddress: CONTRACT_DEPLOYER,
      contractName: CITYCOIN_CORE,
      functionName: 'register-user',
      functionArgs: [minerMemoCV],
      network: NETWORK,
      onFinish: result => {
        setLoading(false);
        setTxId(result.txId);
      },
      onCancel: () => {
        setLoading(false);
      },
    });
  };

  return (
    <>
      <h3>{activationStatus ? 'Contract Activated!' : 'Activate CityCoin Mining'}</h3>
      <CurrentBlockHeight />
      {activationStatus ? (
        <p>
          {minerThreshold} users have registered and mining will begin at block #
          {activationBlockHeight}.
        </p>
      ) : (
        <>
          {' '}
          <p>
            Before mining can begin, at least {minerThreshold} users must register with the contract
            to signal activation.
          </p>
          <ul>
            <li>Miners Registered: {minerCount}</li>
            <li>Threshold: {minerThreshold} Users</li>
          </ul>
          <div className="progress mb-3">
            <div
              className="progress-bar"
              role="progressbar"
              style={styles}
              aria-valuenow={((minerCount / minerThreshold) * 100).toFixed(2)}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              {((minerCount / minerThreshold) * 100).toFixed(2)}%
            </div>
          </div>
          {minerRegistered && <p>Registration Complete! User ID: {minerId}</p>}
          {!minerRegistered && (
            <>
              <hr />
              <form>
                <input
                  type="text"
                  className="form-control"
                  ref={minerMemoRef}
                  aria-label="Registration Message"
                  placeholder="Registration Message (optional)"
                  minLength="1"
                  maxLength="50"
                />
                <br />
                <button
                  className="btn btn-block btn-primary"
                  type="button"
                  disabled={txId}
                  onClick={registerAction}
                >
                  <div
                    role="status"
                    className={`${
                      loading ? '' : 'd-none'
                    } spinner-border spinner-border-sm text-info align-text-top mr-2`}
                  />
                  Register
                </button>
              </form>
            </>
          )}
        </>
      )}

      {txId && <TxStatus txId={txId} />}
    </>
  );
}
