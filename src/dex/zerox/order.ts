import {
  ZeroXSignedOrder,
  ZeroXSignedOrderV2,
  ZeroXSignedOrderV4,
} from './types';

export class ZeroXOrder {
  static formatOrderV4(order: ZeroXSignedOrderV4, version: number) {
    return {
      makerToken: order.makerToken,
      takerToken: order.takerToken,
      makerAmount: order.makerAmount,
      takerAmount: order.takerAmount,
      maker: order.maker,
      taker: order.taker,
      txOrigin: order.txOrigin,
      pool: order.pool,
      expiry: order.expiry,
      salt: order.salt,
    };
  }

  static formatOrderV23(order: ZeroXSignedOrderV2, version: number) {
    const feeAssetData =
      version === 3
        ? {
            makerFeeAssetData: order.makerFeeAssetData,
            takerFeeAssetData: order.takerFeeAssetData,
          }
        : {};

    return {
      makerAddress: order.makerAddress,
      takerAddress: order.takerAddress,
      feeRecipientAddress: order.feeRecipientAddress,
      senderAddress: order.senderAddress,
      makerAssetAmount: order.makerAssetAmount,
      takerAssetAmount: order.takerAssetAmount,
      makerFee: order.makerFee,
      takerFee: order.takerFee,
      expirationTimeSeconds: order.expirationTimeSeconds,
      salt: order.salt,
      makerAssetData: order.makerAssetData,
      takerAssetData: order.takerAssetData,
      ...feeAssetData,
    };
  }

  static formatOrders(order: ZeroXSignedOrder, version: number = 2) {
    if (isV4Order(order, version)) {
      return ZeroXOrder.formatOrderV4(order, version);
    }
    return ZeroXOrder.formatOrderV23(order, version);
  }
}

function isV4Order(
  order: ZeroXSignedOrder,
  version: number = 2,
): order is ZeroXSignedOrderV4 {
  return version === 4;
}
