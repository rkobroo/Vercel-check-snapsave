import { snapsave } from "snapsave-media-downloader";

const download = await snapsave("https://www.instagram.com/reel/CtjoC2BNsB2");

console.log(JSON.stringify(download, null, 2));
