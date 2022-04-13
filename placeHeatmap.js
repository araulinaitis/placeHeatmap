import * as fs from 'fs/promises';
import jimp from 'jimp';
import { Buffer } from 'buffer';

const maxDeltaColor = { r: 255, g: 255, b: 0, a: 255 };
const minDeltaColor = { r: 255, g: 0, b: 0, a: 255 };
const interval = 5 * 60 * 1000; // min * s/min * ms/s = ms;
let lastTime;
let imageIdx = 0;

for (let fName of await fs.readdir('./data')) {
  console.log(fName);
  const data = (await fs.readFile(`./data/${fName}`, { encoding: 'utf-8' })).split('\n').map(row => row.split(',').map(entry => entry.replace('"', '')));
  lastTime = Date.parse(data[1][0]);

  let thisImage = [];
  let deltas = [];

  let maxCol = 0;
  let maxRow = 0;

  for (let dataRow of data) {
    if (dataRow[0] === 'timestamp') continue;
    const [timestamp, uid, color] = dataRow;
    const timeInMs = Date.parse(timestamp);
    if (timeInMs - lastTime > interval) {
      await handleImageEnd(deltas, maxCol, maxRow, lastTime);
      deltas = [];
      thisImage = [];
      lastTime = timeInMs;
    }

    // r/place data does coordinates in col,row
    const col = parseInt(dataRow[3]);
    const row = parseInt(dataRow[4]);
    if (dataRow[5]) continue;

    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;

    if (!thisImage[row]) thisImage[row] = [];

    if (thisImage[row]?.[col] != color) {
      if (!deltas[row]) deltas[row] = [];
      if (!deltas[row][col]) deltas[row][col] = 0;
      deltas[row][col]++;
    } else {
      thisImage[row][col] = color;
    }
  }
}

async function handleImageEnd(deltas, maxCol, maxRow, lastTime) {
  console.log({ maxRow, maxCol });
  // calculate differences, save current image diff, set old image to current image
  let deltaImgPreBuffer = [];
  // get max delta for this image
  let maxDelta = 0;
  for (let rowIdx = 0; rowIdx < maxRow; ++rowIdx) {
    if (!deltas?.[rowIdx]) deltas[rowIdx] = [];
    for (let colIdx = 0; colIdx < maxCol; colIdx++) {
      if (!deltas[rowIdx]?.[colIdx]) deltas[rowIdx][colIdx] = 0;
      if (deltas[rowIdx][colIdx] > maxDelta) maxDelta = deltas[rowIdx][colIdx];
    }
  }

  console.log(maxDelta);
  for (let rowIdx = 0; rowIdx <= maxRow; ++rowIdx) {
    const row = deltas?.[rowIdx] ?? [];
    for (let colIdx = 0; colIdx <= maxCol; ++colIdx) {
      const val = row?.[colIdx];
      if (val == undefined || Math.abs(val) < 1e-5) {
        deltaImgPreBuffer.push(0, 0, 0, 0); // transparent pixel
        continue;
      }
      const thisFraction = await interpolate(val, 1, maxDelta, 0, 1);
      const rgba = await interpolateColor(thisFraction, minDeltaColor, maxDeltaColor);
      deltaImgPreBuffer.push(Math.round(rgba.r), Math.round(rgba.g), Math.round(rgba.b), Math.round(rgba.a));
    }
  }

  const deltaImgBuffer = Buffer.from(deltaImgPreBuffer);
  const heatmap = new jimp({ data: deltaImgBuffer, height: maxRow + 1, width: maxCol + 1 }, (err, image) => {
    if (err) console.log(`error creating image: ${err}`);
  });

  try {
    await heatmap.writeAsync(`./images/${lastTime}.png`);
  } catch (err) {
    console.error(err);
  } finally {
    imageIdx++;
  }
}

async function interpolate(x, inMin, inMax, outMin, outMax) {
  return outMin + ((outMax - outMin) * (x - inMin)) / (inMax - inMin);
}

async function interpolateColor(x, c1, c2) {
  const out = {};
  for (let channel in c1) {
    if (c2[channel] == undefined) continue;
    out[channel] = await interpolate(x, 0, 1, c1[channel], c2[channel]);
  }
  return out;
}