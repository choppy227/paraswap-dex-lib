import dotenv from 'dotenv';
dotenv.config();

import { Network, ContractMethod, SwapSide, MAX_UINT } from '../../constants';
import { generateConfig } from '../../config';
import { newTestE2E, getEnv } from '../../../tests/utils-e2e';
import {
  SmartTokens,
  GENERIC_ADDR1,
  testAccount,
} from '../../../tests/constants-e2e';
import { startTestServer } from './example-api.test';
import { RFQConfig } from './types';

jest.setTimeout(1000 * 60 * 3);

describe('GenericRFQ E2E Mainnet', () => {
  let stopServer: undefined | Function = undefined;

  beforeAll(() => {
    stopServer = startTestServer(testAccount);
  });

  const network = Network.MAINNET;
  const smartTokens = SmartTokens[network];

  const srcToken = smartTokens.WETH;
  const destToken = smartTokens.DAI;

  const config = generateConfig(network);

  describe('GenericRFQ', () => {
    const dexKey = 'DummyParaSwapPool';

    srcToken.addBalance(testAccount.address, MAX_UINT);
    srcToken.addAllowance(
      testAccount.address,
      config.augustusRFQAddress,
      MAX_UINT,
    );

    destToken.addBalance(testAccount.address, MAX_UINT);
    destToken.addAllowance(
      testAccount.address,
      config.augustusRFQAddress,
      MAX_UINT,
    );

    describe('Simpleswap', () => {
      it('SELL WETH -> DAI', async () => {
        await newTestE2E({
          config,
          srcToken,
          destToken,
          senderAddress: GENERIC_ADDR1,
          thirdPartyAddress: testAccount.address,
          _amount: '1000000000000000000',
          swapSide: SwapSide.SELL,
          dexKey: dexKey,
          contractMethod: ContractMethod.simpleSwap,
          network: network,
        });
      });

      it('SELL DAI -> WETH', async () => {
        await newTestE2E({
          config,
          destToken,
          srcToken,
          senderAddress: GENERIC_ADDR1,
          thirdPartyAddress: testAccount.address,
          _amount: '1000000000000000000',
          swapSide: SwapSide.SELL,
          dexKey: dexKey,
          contractMethod: ContractMethod.simpleSwap,
          network: network,
        });
      });

      it('BUY WETH -> DAI', async () => {
        await newTestE2E({
          config,
          srcToken,
          destToken,
          senderAddress: GENERIC_ADDR1,
          thirdPartyAddress: testAccount.address,
          _amount: '1000000000000000000',
          swapSide: SwapSide.BUY,
          dexKey: dexKey,
          contractMethod: ContractMethod.simpleBuy,
          network: network,
        });
      });

      it('BUY DAI -> WETH', async () => {
        await newTestE2E({
          config,
          destToken,
          srcToken,
          senderAddress: GENERIC_ADDR1,
          thirdPartyAddress: testAccount.address,
          _amount: '1000000000000000000',
          swapSide: SwapSide.BUY,
          dexKey: dexKey,
          contractMethod: ContractMethod.simpleBuy,
          network: network,
        });
      });
    });
  });

  afterAll(() => {
    if (stopServer) {
      stopServer();
    }
  });
});

const buildConfigForGenericRFQ = (): RFQConfig => {
  const url = getEnv('GENERIC_RFQ_URL');

  const secret = {
    secretKey: atob(getEnv('GENERIC_RFQ_SECRET_KEY')),
    accessKey: getEnv('GENERIC_RFQ_ACCESS_KEY'),
    domain: 'paraswap',
  };

  return {
    maker: getEnv('GENERIC_RFQ_MAKER_ADDRESS'),
    tokensConfig: {
      reqParams: {
        url: `${url}/tokens`,
        method: 'GET',
      },
      secret,
      intervalMs: 1000 * 60 * 60 * 10, // every 10 minutes
      dataTTLS: 1000 * 60 * 60 * 11, // ttl 11 minutes
    },
    pairsConfig: {
      reqParams: {
        url: `${url}/pairs`,
        method: 'GET',
      },
      secret,
      intervalMs: 1000 * 60 * 60 * 10, // every 10 minutes
      dataTTLS: 1000 * 60 * 60 * 11, // ttl 11 minutes
    },
    rateConfig: {
      reqParams: {
        url: `${url}/prices`,
        method: 'GET',
      },
      secret,
      intervalMs: 1000 * 60 * 60 * 1, // every 1 minute
      dataTTLS: 1000 * 60 * 60 * 1, // ttl 1 minute
    },
    firmRateConfig: {
      url: `${url}/firm`,
      method: 'POST',
      secret,
    },
    blacklistConfig: {
      reqParams: {
        url: `${url}/blacklist`,
        method: 'GET',
      },
      secret,
      intervalMs: 1000 * 60 * 60 * 10,
      dataTTLS: 1000 * 60 * 60 * 11,
    },
  };
};

describe('GenericRFQ YOUR_NAME E2E Mainnet', () => {
  const dexKey = 'YOUR_NAME';

  const network = Network.MAINNET;
  const smartTokens = SmartTokens[network];

  const srcToken = smartTokens.USDC;
  const destToken = smartTokens.WBTC;

  const config = generateConfig(network);

  config.rfqConfigs[dexKey] = buildConfigForGenericRFQ();

  describe('GenericRFQ', () => {
    srcToken.addBalance(testAccount.address, MAX_UINT);
    srcToken.addAllowance(
      testAccount.address,
      config.augustusRFQAddress,
      MAX_UINT,
    );

    destToken.addBalance(testAccount.address, MAX_UINT);
    destToken.addAllowance(
      testAccount.address,
      config.augustusRFQAddress,
      MAX_UINT,
    );

    describe('Simpleswap', () => {
      it.only('BUY USDC -> WBTC', async () => {
        await newTestE2E({
          config,
          srcToken,
          destToken,
          senderAddress: GENERIC_ADDR1,
          thirdPartyAddress: testAccount.address,
          _amount: '1000000',
          swapSide: SwapSide.BUY,
          dexKey: dexKey,
          contractMethod: ContractMethod.simpleBuy,
          network: network,
          sleepMs: 5000,
        });
      });
    });
  });
});
