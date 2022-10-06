// /*
//  * It is just standalone helper script to estimate how wide bitMap range can be.
//  * We need it in order to cover all possible state variations
//  */
// import * as dotenv from 'dotenv';
// dotenv.config();
//
// import axios from 'axios';
// import Web3 from 'web3';
// import { Interface } from '@ethersproject/abi';
// import _ from 'lodash';
// import MulticallABI from '../../../abi/multi-v2.json';
// import UniswapV3PoolABI from '../../../abi/uniswap-v3/UniswapV3Pool.abi.json';
// import { UNISWAPV3_SUBGRAPH_URL } from '../constants';
// import { MULTI_V2, Network, ProviderURL } from '../../../constants';
// import { BI_MAX_INT16, BI_MIN_INT16 } from '../../../bigint-constants';
//
// type SubgraphResult = { id: string; totalValueLockedUSD: string };
//
// const network = Network.MAINNET;
//
// const web3Provider = new Web3(ProviderURL[network]);
// const multicallContract = new web3Provider.eth.Contract(
//   MulticallABI as any,
//   MULTI_V2[network],
// );
//
// const poolIface = new Interface(UniswapV3PoolABI);
//
// async function getBitmap(
//   pool: string,
//   indexes: number[],
// ): Promise<Record<number, bigint>> {
//   const callData = indexes.map(ind => ({
//     target: pool,
//     callData: poolIface.encodeFunctionData('tickBitmap', [ind]),
//   }));
//
//   try {
//     // console.log(
//     //   `Start fetching bitMaps for ${pool}. Indexes from ${indexes[0]} to ${
//     //     indexes.slice(-1)[0]
//     //   }`,
//     // );
//     // const start = Date.now();
//     const result = await multicallContract.methods.aggregate(callData).call({});
//
//     // console.log(
//     //   `Done fetching bitMaps for ${pool}. Indexes from ${indexes[0]} to ${
//     //     indexes.slice(-1)[0]
//     //   } took ${Math.floor((Date.now() - start) / 1000)} sec.`,
//     // );
//
//     const decoded = result.returnData.map((d: string): bigint =>
//       BigInt(poolIface.decodeFunctionResult('tickBitmap', d)[0]),
//     ) as bigint[];
//
//     return decoded.reduce<Record<number, bigint>>((acc, curr, i) => {
//       if (curr !== 0n) {
//         acc[indexes[i]] = curr;
//       }
//       return acc;
//     }, {});
//   } catch (e) {
//     console.log(
//       `Can not fetch bitMaps for ${pool}. Indexes from ${indexes[0]} to ${
//         indexes.slice(-1)[0]
//       }. Pool state is not full`,
//       e,
//     );
//     return [];
//   }
// }
//
// async function getBitmaps(
//   pool: string,
//   start: number,
//   end: number,
//   chunks: number,
// ): Promise<Record<number, bigint>> {
//   const total = Math.abs(start) + end + 1;
//   const indexes = _.range(start, end + 1);
//
//   const chunked = _.chunk(indexes, Math.ceil(total / chunks));
//
//   const bitMapArrays = await Promise.all(
//     chunked.map(async chunk => getBitmap(pool, chunk)),
//   );
//
//   // if (bitMapArrays.some(bitMapArray => Object.keys(bitMapArray).length === 0)) {
//   //   return {};
//   // }
//
//   const bitMapsReduced = bitMapArrays.reduce<Record<number, bigint>>(
//     (acc, curr) => ({ ...acc, ...curr }),
//     {},
//   );
//
//   return bitMapsReduced;
// }
//
// async function getPools(): Promise<SubgraphResult[]> {
//   const query = `
//     {
//       pools(first: 1000, skip: 1000, orderBy: totalValueLockedUSD, orderDirection: desc) {
//         id
//         totalValueLockedUSD
//         }
//     }
//   `;
//   try {
//     const res = await axios.post<{ data: { pools: SubgraphResult[] } }>(
//       UNISWAPV3_SUBGRAPH_URL,
//       { query },
//     );
//     return res.data.data.pools;
//   } catch (e) {
//     console.log(e);
//     return [];
//   }
// }
//
// (async function main() {
//   const pools = await getPools();
//   const lowerTickBitmap = Number(BI_MIN_INT16);
//   const upperTickBitmap = Number(BI_MAX_INT16);
//   const chunks = 20;
//   const poolsNumToProcess = 1;
//   const poolStartToProcess = 20;
//
//   // Calculated from 213 first pools and 19 after 1000
//   let globalMin = {
//     index: -3466,
//     value: 16777216n,
//     pool: '0x5777d92f208679db4b9778590fa3cab3ac9e2168',
//   };
//
//   let globalMax = {
//     index: 3465,
//     value:
//       6901746346790563787434755862277025452451108972170386555162524223799296n,
//     pool: '0x5777d92f208679db4b9778590fa3cab3ac9e2168',
//   };
//
//   const indexesCounter: Record<number, number> = JSON.parse(
//     // Last result for 213 and 19 after 1000
//     `{"0":63,"1":37,"2":42,"3":25,"4":19,"5":21,"6":9,"7":9,"8":19,"9":6,"10":6,"11":13,"12":3,"13":8,"14":8,"15":6,"16":7,"17":46,"18":7,"19":9,"20":5,"21":4,"22":3,"23":7,"24":1,"25":2,"26":3,"28":2,"29":1,"30":1,"31":1,"35":1,"37":1,"38":1,"39":1,"41":1,"42":1,"44":2,"52":1,"53":2,"57":38,"62":1,"67":1,"68":1,"69":1,"70":2,"71":1,"72":2,"73":1,"74":1,"75":2,"76":1,"77":1,"78":2,"79":1,"80":1,"81":1,"82":2,"83":1,"84":1,"85":1,"86":1,"87":1,"89":3,"90":1,"91":1,"92":1,"93":2,"94":1,"96":1,"97":1,"98":2,"99":1,"100":1,"101":1,"102":1,"103":1,"104":1,"105":2,"106":1,"107":4,"108":1,"110":1,"111":1,"113":1,"114":1,"116":1,"117":1,"118":1,"123":1,"124":1,"125":2,"134":1,"136":1,"137":1,"138":1,"139":1,"140":1,"143":2,"150":1,"152":1,"161":1,"177":1,"296":1,"346":10,"406":1,"444":1,"558":1,"596":1,"704":1,"742":1,"1076":1,"1077":1,"3465":1,"-3466":1,"-1080":4,"-1079":1,"-347":11,"-120":1,"-119":1,"-117":2,"-110":2,"-109":4,"-108":12,"-106":2,"-97":1,"-96":1,"-78":3,"-1":73,"-58":41,"-20":4,"-36":4,"-18":47,"-107":2,"-2":68,"-6":38,"-27":3,"-26":1,"-24":2,"-23":2,"-22":2,"-21":2,"-17":9,"-16":6,"-15":5,"-14":12,"-13":6,"-12":11,"-11":11,"-10":8,"-9":20,"-8":20,"-5":41,"-3":55,"-7":24,"-4":40,"-162":1,"-153":1,"-144":1,"-135":1,"-126":1,"-104":1,"-100":1,"-99":1,"-90":1,"-86":1,"-85":1,"-83":1,"-82":1,"-81":1,"-80":1,"-79":1,"-77":1,"-76":1,"-75":1,"-74":1,"-73":1,"-72":1,"-71":1,"-70":1,"-68":1,"-67":1,"-66":1,"-63":1,"-61":1,"-54":2,"-45":1,"-39":1,"-38":2,"-35":1,"-34":1,"-33":2,"-32":1,"-31":1,"-30":1,"-29":1,"-28":1,"-25":1,"-37":1,"-375":2,"-337":2,"-19":4}`,
//   );
//
//   const chunkedPools = _.chunk(pools, poolsNumToProcess);
//
//   for (const [index, chunkedPool] of chunkedPools
//     .slice(poolStartToProcess)
//     .entries()) {
//     console.log(
//       `\nStart processing batch #${poolStartToProcess + index} pools...`,
//     );
//     const start = Date.now();
//     await Promise.all(
//       chunkedPool.map(async pool => {
//         const bitMaps = await getBitmaps(
//           pool.id,
//           lowerTickBitmap,
//           upperTickBitmap,
//           chunks,
//         );
//
//         let newGlobalMinPosition = {
//           index: globalMin.index,
//           value: globalMin.value,
//         };
//         let newGlobalMaxPosition = {
//           index: globalMax.index,
//           value: globalMax.value,
//         };
//
//         Object.keys(bitMaps).map(v => {
//           const parsed = Number(v);
//           indexesCounter[parsed] =
//             indexesCounter[parsed] === undefined
//               ? 1
//               : indexesCounter[parsed] + 1;
//
//           if (parsed < newGlobalMinPosition.index) {
//             newGlobalMinPosition.index = parsed;
//             newGlobalMinPosition.value = bitMaps[parsed];
//           }
//           if (parsed > newGlobalMaxPosition.index) {
//             newGlobalMaxPosition.index = parsed;
//             newGlobalMaxPosition.value = bitMaps[parsed];
//           }
//
//           return parsed;
//         });
//
//         if (newGlobalMinPosition.index !== globalMin.index) {
//           console.log(
//             `Found new globalMin=${newGlobalMinPosition.index} in pool ${pool.id} and value=${newGlobalMinPosition.value}`,
//           );
//           globalMin.index = newGlobalMinPosition.index;
//           globalMin.value = newGlobalMinPosition.value;
//           globalMin.pool = pool.id;
//         }
//         if (newGlobalMaxPosition.index !== globalMax.index) {
//           console.log(
//             `Found new globalMax=${newGlobalMaxPosition.index} in pool ${pool.id} and value=${newGlobalMaxPosition.value}`,
//           );
//           globalMax.index = newGlobalMaxPosition.index;
//           globalMax.value = newGlobalMaxPosition.value;
//           globalMax.pool = pool.id;
//         }
//       }),
//     );
//
//     console.log(
//       `Done processing batch #${
//         poolStartToProcess + index
//       } pools Took ${Math.floor(
//         (Date.now() - start) / 1000,
//       )} sec. Current indexesCounter state is:`,
//     );
//     console.log(JSON.stringify(indexesCounter));
//     console.log('\nCurrent globalMin:');
//     console.log(
//       JSON.stringify(
//         globalMin,
//         (key, value) => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
//       ),
//     );
//     console.log('\nCurrent globalMax:');
//     console.log(
//       JSON.stringify(
//         globalMax,
//         (key, value) => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
//       ),
//     );
//   }
// })();
