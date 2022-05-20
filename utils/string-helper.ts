import { AssetInfoQuery } from "./interfaces";

export const getAssetInfo = (assetUrl: string): AssetInfoQuery => {
  // asset_url format 'https://opensea.io/assets/<contract_address>/<token_id>'
  // TODO research node parse url
  const arr = assetUrl.split("/");

  return {
    contractAddress: arr[arr.length - 2],
    tokenId: arr[arr.length - 1],
  };
};
