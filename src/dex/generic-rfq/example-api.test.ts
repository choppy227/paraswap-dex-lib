import express from 'express';

const app = express();

const markets = {
  markets: [
    {
      id: 'WETH-DAI',
      base: {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        decimals: 18,
        type: 'erc20',
      },
      quote: {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        decimals: 18,
        type: 'erc20',
      },
      status: 'available',
    },
  ],
};

const prices = {
  'WETH-DAI': {
    buyAmounts: [
      '1.166200000000000000',
      '1.166200000000000000',
      '1.166200000000000000',
      '1.166200000000000000',
      '1.166200000000000000',
      '1.169000000000000000',
    ],
    buyPrices: [
      '1333.425240000000000000',
      '1333.024812000000000000',
      '1332.624384000000000000',
      '1332.223956000000000000',
      '1331.823528000000000000',
      '1331.423100000000000000',
    ],
    sellAmounts: [
      '1.166200000000000000',
      '1.166200000000000000',
      '1.166200000000000000',
      '1.166200000000000000',
      '1.166200000000000000',
      '1.169000000000000000',
    ],
    sellPrices: [
      '1336.745410000000000000',
      '1337.146033000000000000',
      '1337.546656000000000000',
      '1337.947279000000000000',
      '1338.347902000000000000',
      '1338.748525000000000000',
    ],
  },
};

app.get('/markets', (req, res) => {
  return res.status(200).json(markets);
});

app.get('/prices', (req, res) => {
  return res.status(200).json(prices);
});

export const startTestServer = () => {
  const server = app.listen(parseInt(process.env.TEST_PORT!, 10));
  return () => {
    server.close();
  };
};
