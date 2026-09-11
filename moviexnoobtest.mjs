import fs from "fs";
import { Readable } from "stream";

const url = "https://lol.movieboxnoob.cc/s?=AAnCJVmtbpiAqCvR6z-djCLJdvdfFGIfLHwVugznDlChopCudpClyV3UfFJMPxVzRML7jS-OGRsLzwCrNaeFzpPYRBG9OD7Wqa_Ozlcm_9zdezB8KUS_ZepC84ouflSTwv8igexnwTStZF_f9XwU8NpFDNo21XvEc1zynSqKcVb_yHFUTULwU-kttpXqgMc1Jzi7GGExZy5DenIQ92nJSNYTu5vUdiTSTzGBQJWo_ONvd1ydXM4qmuam4D2S0BUzBqOCoYPXUdic_V8hsy9Nn6U7RLCAmB_bp_fRVwDOMLNVxn7FXoZ_PV4XfQkwaTPB.js";

async function download() {
  console.log("Fetching…");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Not=A?Brand\";v=\"99\", \"Opera\";v=\"135\", \"Chromium\";v=\"151\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "Referer": "https://cinejoy.to/"
    }
  });

  if (!response.ok) {
    console.error("Fetch failed:", response.status, response.statusText);
    return;
  }

  console.log("Converting WebStream → NodeStream…");

  const nodeStream = Readable.fromWeb(response.body);
  const fileStream = fs.createWriteStream("file.mp4");

  await new Promise((resolve, reject) => {
    nodeStream.pipe(fileStream);
    nodeStream.on("error", reject);
    fileStream.on("finish", resolve);
  });

  console.log("Saved file.mp4");
}

download();
