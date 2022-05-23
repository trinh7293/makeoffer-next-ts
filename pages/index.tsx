import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { Button, ButtonGroup, Form, FormText } from "react-bootstrap";
import io, { Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import {
  Client2Server,
  ProcessHandlingStatus,
  Server2Client,
} from "../utils/constant";
import {
  AssetInfoQuery,
  CollectionInfo,
  MkOfferResult,
  RunningInfo,
  SocketResponse,
} from "../utils/interfaces";
import {
  BID_LIFETIME_OPTIONS_UI,
  BID_OPTIONS,
  BID_OPTIONS_UI,
} from "../utils/clientConstant";
import { fixNumber } from "../utils/number-helper";
import { getAssetInfo } from "../utils/string-helper";
import { calBidPrice } from "../utils/openseaHelper";

let socket: Socket<DefaultEventsMap, DefaultEventsMap>;

const Home: NextPage = () => {
  const [results, setResults] = useState<MkOfferResult[]>([]);
  const [handlingStatus, setHandlingStatus] = useState<ProcessHandlingStatus>(
    ProcessHandlingStatus.STOPPED
  );
  const [bidLifeTime, setBidLifeTime] = useState<number>(
    BID_LIFETIME_OPTIONS_UI[0].value
  );
  const [collectionSlug, setCollectionSlug] = useState<string>("");
  const [bidOption, setBidOption] = useState<BID_OPTIONS>(
    BID_OPTIONS.BELOW_PERCENT
  );
  const [bidCoefficient, setBidCoefficient] = useState<number>(0);
  const [floorPrice, setFloorPrice] = useState<number>();
  const [collectionName, setCollectionName] = useState<string>("");
  const [arrayUrl, setArrayUrl] = useState<string[]>([]);

  useEffect(() => {
    socketInitializer();
  }, []);

  const socketInitializer = async () => {
    await fetch("/api/socket");
    socket = io();

    socket.on("connect", () => {
      console.log("connected");
    });

    socket.on(Server2Client.UPDATE_RESULT, (results) => {
      setResults(results);
    });
    socket.on(Server2Client.NO_MORE_ITEM, () => {
      console.log("done");
      setHandlingStatus(ProcessHandlingStatus.STOPPED);
    });
  };
  const play = () => {
    if (handlingStatus === ProcessHandlingStatus.PAUSED) {
      resumePro();
    } else {
      startPro();
    }
  };

  const convertFile2Arr = async (e: any) => {
    const file = e.target.files[0] as File;
    const fileText = await file.text();
    const arrResult = fileText.split(/\r\n|\n/).filter((line) => line);
    console.log("arrResult", arrResult);
    setArrayUrl(arrResult);
  };

  const startPro = () => {
    const runningInfo: RunningInfo = {
      items: arrayUrl.map((url) => {
        const assetInfo: AssetInfoQuery = getAssetInfo(url);
        return assetInfo;
      }),
      bidLifeTime,
      bidPrice: calBidPrice(bidCoefficient, bidOption, floorPrice) || 0,
      collectionSlug,
      bidOption,
      bidCoefficient,
    };
    socket.emit(
      Client2Server.START_PROCESS,
      runningInfo,
      (res: SocketResponse) => {
        if (res.error) {
          console.log(res.status);
          return;
        } else {
          setHandlingStatus(ProcessHandlingStatus.RUNNING);
          setResults([]);
        }
      }
    );
  };
  const resumePro = () => {
    socket.emit(Client2Server.RESUME_PROCESS, null, () => {
      setHandlingStatus(ProcessHandlingStatus.RUNNING);
    });
  };
  const getCollectionInfo = () => {
    socket.emit(
      Client2Server.GET_COLLECTION_INFO,
      collectionSlug,
      (colInfo: CollectionInfo) => {
        setFloorPrice(colInfo.floorPrice);
        setCollectionName(colInfo.name);
      }
    );
  };
  const pauseProcess = () => {
    socket.emit(Client2Server.PAUSE_PROCESS, null, () => {
      setHandlingStatus(ProcessHandlingStatus.PAUSED);
    });
    // socket.emit(Client2Server.START_PROCESS, RUN_ARR);
  };
  const stopProcess = () => {
    socket.emit(Client2Server.STOP_PROCESS, null, () => {
      setHandlingStatus(ProcessHandlingStatus.STOPPED);
    });
  };
  const isRunning = () => {
    return handlingStatus === ProcessHandlingStatus.RUNNING;
  };
  const isPause = () => {
    return handlingStatus === ProcessHandlingStatus.PAUSED;
  };
  const isStop = () => {
    return handlingStatus === ProcessHandlingStatus.STOPPED;
  };
  const getPlayText = () => {
    return isPause() ? "Resume" : "Start";
  };
  const getBidValLabel = () => {
    if (bidOption === BID_OPTIONS.FIXED) {
      return "Bid Value";
    }
    return "Bid Percent";
  };
  const getPlayDisable = () => {
    return (
      isRunning() ||
      (isStop() &&
        (!calBidPrice(bidCoefficient, bidOption, floorPrice) ||
          arrayUrl.length === 0))
    );
  };
  return (
    <div className={styles.container}>
      <Head>
        <title>Make Offer Bot</title>
        <meta name="description" content="Making offer bot on opensea" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Form onSubmit={play}>
          <Form.Group className="mb-3" controlId="bidLifeTime">
            <Form.Label>Bid life time</Form.Label>
            <Form.Select
              disabled={!isStop()}
              value={bidLifeTime}
              onChange={(e) => setBidLifeTime(Number(e.target.value))}
            >
              {BID_LIFETIME_OPTIONS_UI.map((item, k) => (
                <option key={k} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3" controlId="collectionSlug">
            <Form.Label>Collection slug</Form.Label>
            <Form.Control
              disabled={!isStop()}
              value={collectionSlug}
              onChange={(e) => setCollectionSlug(e.target.value)}
              type="text"
              placeholder="Enter Slug"
            />
          </Form.Group>
          <Button
            disabled={bidOption === BID_OPTIONS.FIXED}
            onClick={getCollectionInfo}
          >
            Get Collection Info
          </Button>
          <br />
          <p>
            Collection Name:{" "}
            <span style={{ color: "yellow" }}>{collectionName}</span>
          </p>
          <p>
            Floor Price: <span style={{ color: "yellow" }}>{floorPrice}</span>
          </p>
          <Form.Group className="mb-3" controlId="bidOption">
            <Form.Label>Bid Option</Form.Label>
            <Form.Select
              disabled={!isStop()}
              value={bidOption}
              onChange={(e) => {
                const val = e.target.value as BID_OPTIONS;
                setBidOption(val);
              }}
            >
              {BID_OPTIONS_UI.map((item, k) => (
                <option key={k} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3" controlId="bidCoefficient">
            <Form.Label>{getBidValLabel()}</Form.Label>
            <Form.Control
              disabled={!isStop()}
              value={bidCoefficient}
              onChange={(e) => setBidCoefficient(Number(e.target.value))}
              type="number"
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="inputFile">
            <Form.Label>Input File</Form.Label>
            <Form.Control
              disabled={!isStop()}
              onChange={(e) => convertFile2Arr(e)}
              type="file"
            />
          </Form.Group>
          <ButtonGroup size="lg" className="mb-2">
            {/* <Button variant="primary" type="submit">
            Submit
          </Button> */}
            <Button disabled={getPlayDisable()} onClick={play}>
              {getPlayText()}
            </Button>
            <Button disabled={!isRunning()} onClick={pauseProcess}>
              Pause
            </Button>
            <Button disabled={isStop()} onClick={stopProcess}>
              Stop
            </Button>
          </ButtonGroup>
        </Form>
        <br />
        <ul>
          {results.map((r, index) => (
            <li key={index}>
              {r.contractAddress}/{r.tokenId}: {r.status}
            </li>
          ))}
        </ul>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  );
};

export default Home;
