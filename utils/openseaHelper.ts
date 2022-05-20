import { CollectionInfo } from "./interfaces";

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
