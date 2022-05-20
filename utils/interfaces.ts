import { BID_OPTIONS } from "./clientConstant";

export interface MkOfferResult {
  contractAddress: string;
  tokenId: string;
  status: string;
}

export interface SocketResponse {
  error: boolean;
  status: string;
}

export interface CollectionInfo {
  floorPrice: number;
  name: string;
}

export interface AssetInfoQuery {
  contractAddress: string;
  tokenId: string;
}

export interface RunningInfo {
  items: AssetInfoQuery[];
  bidLifeTime: number;
  bidPrice: number;
  collectionSlug: string;
  bidOption: BID_OPTIONS;
  bidCoefficient: number;
}

export interface Order {
  side: number;
  current_price: string;
  maker: {
    address: string;
  };
}

export interface AssetInfo {
  orders: Order[];
}
