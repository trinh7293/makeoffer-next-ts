// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import {
  Client2Server,
  ProcessHandlingStatus,
  Server2Client,
} from "../../utils/constant";
import { MkOfferResult, SocketResponse } from "../../utils/interfaces";

let arrRun: string[] = [];
let results: MkOfferResult[] = [];
let handlingStatus = ProcessHandlingStatus.STOPPED;
let indexRunning = 0;

const runProcess = async (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  console.log("runProcess");
  console.log("indexRunning", indexRunning);
  console.log("arrRun", arrRun);
  while (indexRunning < arrRun.length) {
    if (
      [ProcessHandlingStatus.PAUSED, ProcessHandlingStatus.STOPPED].includes(
        handlingStatus
      )
    ) {
      break;
    }
    console.log("start make offer item: ", arrRun[indexRunning]);
    // if (
    //   bidOption !== BID_OPTIONS.FIXED &&
    //   indexRunning > 0 &&
    //   indexRunning % 10 === 0
    // ) {
    //   refreshFloorPrice();
    // }
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
  url: string,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const resultMkOff: MkOfferResult = {
    status: "Success",
    url,
  };
  try {
    await sleep(2000);
  } catch (error) {
    resultMkOff.status = `Fail: ${error}`;
  } finally {
    results.push(resultMkOff);
    socket.broadcast.emit(Server2Client.UPDATE_RESULT, results);
  }
};

export default function handler(req: NextApiRequest, res: any) {
  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      socket.emit(Server2Client.UPDATE_RESULT, results);
      socket.on(Client2Server.START_PROCESS, (arr_run: string[], cb) => {
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
        handlingStatus = ProcessHandlingStatus.RUNNING;
        arrRun = arr_run;
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
      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });
  }
  res.end();
}
