import { BID_OPTIONS } from "./clientConstant";
import { config } from "./config";
import { CollectionInfo } from "./interfaces";
import { fixNumber } from "./number-helper";
require("isomorphic-fetch");

const opensea = require("opensea-js");
const OpenSeaPort = opensea.OpenSeaPort;
const Network = opensea.Network;
const HDWalletProvider = require("@truffle/hdwallet-provider");

const providerUrl = config.PROVIDER;
const walletAddress = config.WALLET_ADDRESS || "";
const walletPrivateKey = config.WALLET_PRIVATE_KEY;
const network = config.NETWORK || "mainnet";
const openSeaApiKey = config.OPENSEA_API_KEY;

if (!walletAddress || !walletPrivateKey || !openSeaApiKey || !providerUrl) {
  console.error("Missing .env variables!");
}

console.log("walletPrivateKey", walletPrivateKey);
console.log("providerUrl", providerUrl);

const providerEngine = new HDWalletProvider(walletPrivateKey, providerUrl);
const seaport = new OpenSeaPort(providerEngine, {
  networkName: network == "mainnet" ? Network.Main : Network.Rinkeby,
  apiKey: openSeaApiKey,
});

export const makeOffer = async (
  tokenAddress: string,
  tokenId: string,
  bidLifeTime: number,
  bidPrice: number
) => {
  try {
    await seaport.createBuyOrder({
      // extracting order to fulfill
      asset: {
        tokenId,
        tokenAddress,
      },
      accountAddress: walletAddress,
      expirationTime: Math.round(Date.now() / 1000 + bidLifeTime),
      startAmount: bidPrice,
    });
  } catch (error) {
    console.log(`error in make offer: ${error}`);
    throw error;
  }
};

export const getCollInfo = async (collectionSlug: string) => {
  try {
    const resu = await fetch(
      `https://api.opensea.io/api/v1/collection/${collectionSlug}`
    );
    const data = await resu.json();
    const collectionInfo: CollectionInfo = {
      floorPrice: data.collection.stats.floor_price,
      name: data.collection.name,
    };
    return collectionInfo;
  } catch (error) {
    console.log("error in collection info: ", error);
    return null;
  }
};

export const calBidPrice = (
  bidCoefficient: number,
  bidOption: BID_OPTIONS,
  floorPrice: number | undefined
) => {
  if (bidCoefficient === null) {
    return null;
  }
  if (bidOption === BID_OPTIONS.FIXED) {
    return fixNumber(Number(bidCoefficient), 7);
  }
  if (!floorPrice) {
    return null;
  }
  if (bidOption === BID_OPTIONS.BELOW_PERCENT) {
    return fixNumber((1 - Number(bidCoefficient) / 100) * floorPrice, 7);
  }
  if (bidOption === BID_OPTIONS.ABOVE_PERCENT) {
    return fixNumber((1 + Number(bidCoefficient) / 100) * floorPrice, 7);
  }
  return null;
};
