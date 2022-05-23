// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest } from "next";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { BID_OPTIONS } from "../../utils/clientConstant";
import {
  Client2Server,
  ProcessHandlingStatus,
  Server2Client,
} from "../../utils/constant";
import {
  AssetInfoQuery,
  MkOfferResult,
  RunningInfo,
  SocketResponse,
} from "../../utils/interfaces";
import { calBidPrice, getCollInfo, makeOffer } from "../../utils/openseaHelper";

let arrRun: AssetInfoQuery[] = [];
let results: MkOfferResult[] = [];
let handlingStatus = ProcessHandlingStatus.STOPPED;
let indexRunning = 0;
let bidLifeTime: number | null = null;
let bidPrice: number | null = null;
let collectionSlug: string | null = null;
let bidOption: BID_OPTIONS | null = null;
let bidCoefficient: number | null = null;

const refreshFloorPrice = async () => {
  try {
    const returnResult = await getCollInfo(collectionSlug || "");
    if (returnResult && bidCoefficient !== null && bidOption !== null) {
      const floorPrice = returnResult.floorPrice;
      bidPrice = calBidPrice(bidCoefficient, bidOption, floorPrice);
      console.log(
        `floor-price refreshed, new val: floor: ${floorPrice}, bidPrice: ${bidPrice}`
      );
    }
  } catch (error) {}
};

const runProcess = async (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  while (indexRunning < arrRun.length) {
    if (
      [ProcessHandlingStatus.PAUSED, ProcessHandlingStatus.STOPPED].includes(
        handlingStatus
      )
    ) {
      break;
    }
    console.log("start make offer item: ", arrRun[indexRunning]);
    if (
      bidOption !== BID_OPTIONS.FIXED &&
      indexRunning > 0 &&
      indexRunning % 10 === 0
    ) {
      refreshFloorPrice();
    }
    handleMkOffer(arrRun[indexRunning], socket);
    if (indexRunning === arrRun.length - 1) {
      socket.broadcast.emit(Server2Client.NO_MORE_ITEM);
      break;
    }
    indexRunning++;
    await sleep(2000);
  }
  handlingStatus = ProcessHandlingStatus.STOPPED;
};

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
const handleMkOffer = async (
  item: AssetInfoQuery,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const { contractAddress, tokenId } = item;
  const result: MkOfferResult = { contractAddress, tokenId, status: "Success" };
  try {
    await makeOffer(
      contractAddress,
      tokenId,
      Number(bidLifeTime),
      Number(bidPrice)
    );
  } catch (error) {
    result.status = `Fail: $${error}`;
  } finally {
    results.push(result);
    socket.broadcast.emit(Server2Client.UPDATE_RESULT, results);
  }
};

export default function handler(req: NextApiRequest, res: any) {
  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new Server(res.socket.server, {
      maxHttpBufferSize: 1e8,
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      socket.emit(Server2Client.UPDATE_RESULT, results);
      socket.on(Client2Server.START_PROCESS, (runningInfo: RunningInfo, cb) => {
        if (handlingStatus !== ProcessHandlingStatus.STOPPED) {
          const status = "you could not run multiple processes";
          console.log(status);
          const resultFailed: SocketResponse = {
            error: true,
            status,
          };
          cb(resultFailed);
          return;
        }
        arrRun = runningInfo.items;
        bidLifeTime = runningInfo.bidLifeTime;
        bidPrice = runningInfo.bidPrice;
        collectionSlug = runningInfo.collectionSlug;
        bidOption = runningInfo.bidOption;
        bidCoefficient = runningInfo.bidCoefficient;
        handlingStatus = ProcessHandlingStatus.RUNNING;
        results = [];
        indexRunning = 0;
        runProcess(socket);
        const result: SocketResponse = {
          error: false,
          status: "ok",
        };
        cb(result);
      });
      socket.on(Client2Server.PAUSE_PROCESS, (_, callback) => {
        handlingStatus = ProcessHandlingStatus.PAUSED;
        console.log("paused");
        callback({ status: "ok" });
      });
      socket.on(Client2Server.RESUME_PROCESS, (_, callback) => {
        handlingStatus = ProcessHandlingStatus.RUNNING;
        runProcess(socket);
        console.log("resumed");
        callback({ status: "ok" });
      });
      socket.on(Client2Server.STOP_PROCESS, (_, callback) => {
        handlingStatus = ProcessHandlingStatus.STOPPED;
        indexRunning = 0;
        console.log("stopped");
        callback({ status: "ok" });
      });
      socket.on(
        Client2Server.GET_COLLECTION_INFO,
        async (slug: string, callback) => {
          const collectionInfo = await getCollInfo(slug);
          callback(collectionInfo);
        }
      );
      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });
  }
  res.end();
}
