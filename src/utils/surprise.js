import { stdev, mean } from "stats-lite";
import * as d3 from "d3";
import * as math from "mathjs";
import { jStat } from "jstat";

const cdf = (x) => {
  return jStat.normal.cdf(x, 0, 1);
};

const getRate = (dataObj, isElicited) => {
  const rateData = [];
  const expectedData = [];
  const populationData = [];
  for (const fipsCode in dataObj) {
    rateData.push(+dataObj[fipsCode].rate);
    if (isElicited) {
      expectedData.push(+dataObj[fipsCode].expectedRate);
    } else {
      expectedData.push(0);
      dataObj[fipsCode].expectedRate = 0;
    }
    populationData.push(+dataObj[fipsCode].population);
  }
  return [rateData, expectedData, populationData];
};

function calculateIQRange(array) {
  array.sort(d3.ascending);
  let q1 = d3.quantile(array, 0.25);
  let q3 = d3.quantile(array, 0.75);
  let skew = skewness(array);
  let mad = math.mad(array);
  let flag = skew < -1 || skew > 1;
  let upperFence = q3 + 1.5 * mad;
  let lowerFence = q1 - 1.5 * mad;
  return [
    flag ? +Math.floor(lowerFence * 100) / 100 : lowerFence,
    flag ? +Math.round(upperFence * 100) / 100 : upperFence,
  ];
}

function skewness(arr) {
  const n = arr.length;
  const mean = arr.reduce((sum, value) => sum + value, 0) / n;
  const variance =
    arr.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  const skew =
    arr.reduce((sum, value) => sum + Math.pow((value - mean) / stdDev, 3), 0) /
    n;
  return skew;
}

const calcSurprise = (d, isElicited, filterIds) => {

  const data = JSON.parse(JSON.stringify(d));

  if (filterIds) {
    for (const fipsCode in data) {
      if (!filterIds.includes(fipsCode)) {
        delete data[fipsCode];
      }
    }
  }

  const rateData = getRate(data, isElicited);
  const rateMean = mean(rateData[0]);
  const expectedMean = mean(rateData[1]); //Use mean from historical data
  const rateStdDev = stdev(rateData[0]);
  const totalPopulation = math.sum(rateData[2]);
  const maxPopulation = math.max(rateData[2]);
  const surpriseData = [];

  let pMs = [1],
    pSMs = [];
  let kl,
    pMDs = [],
    diffs = [0],
    s = 0;

  let minZScore = 100;
  let maxZScore = -100;

  for (const fipsCode in data) {
    if (+data[fipsCode].rate !== fipsCode) {
      s = isElicited
        ? (+data[fipsCode].rate - expectedMean) /
          (rateStdDev / Math.sqrt(+data[fipsCode].population / totalPopulation))
        : (+data[fipsCode].rate - rateMean) /
          (rateStdDev /
            Math.sqrt(+data[fipsCode].population / totalPopulation));
      data[fipsCode].zScore = (+data[fipsCode].rate - rateMean) / rateStdDev;
      if (data[fipsCode].zScore < minZScore) {
        minZScore = data[fipsCode].zScore;
      }
      if (data[fipsCode].zScore > maxZScore) {
        maxZScore = data[fipsCode].zScore;
      }
      pSMs.push(2 * (1 - cdf(Math.abs(s))));
    } else {
      pSMs.push(0);
    }
  }

  let iter = 0;
  for (const fipsCode in data) {
    data[fipsCode].population = +data[fipsCode].population;
    if (+data[fipsCode].rate == 0 || data[fipsCode].population == undefined) {
      data[fipsCode].surprise = 0;
      surpriseData.push(0);
    } else {
      diffs[0] = isElicited
        ? +data[fipsCode].rate - expectedMean
        : +data[fipsCode].rate - rateMean;


      pMDs[0] = pMs[0] * pSMs[iter];

      kl = 0;
      let voteSum = 0;
      kl += +pMDs[0] * (Math.log(+pMDs[0] / +pMs[0]) / Math.log(2));
      if (Number.isNaN(kl)) {
        data[fipsCode].surprise = 0;
        surpriseData.push(0);
      } else {
        voteSum += diffs[0] * pMs[0];
        let surprise = voteSum >= 0 ? +Math.abs(kl) : -1 * +Math.abs(kl);
        if (isElicited) {
          data[fipsCode].surprise =
            +data[fipsCode].expectedRate == 0 ? 0 : +surprise;
          +data[fipsCode].expectedRate == 0
            ? surpriseData.push(0)
            : surpriseData.push(+surprise);
        } else {
          data[fipsCode].surprise = +surprise;
          surpriseData.push(+surprise);
        }
      }
    }
    iter++;
  }

  let limit =
    Math.abs(d3.extent(surpriseData)[1]) > Math.abs(d3.extent(surpriseData)[0])
      ? Math.abs(d3.extent(surpriseData)[1])
      : Math.abs(d3.extent(surpriseData)[0]);
  return {
    counties: data,
    surpriseRange: [parseFloat(-limit.toFixed(3)), parseFloat(limit.toFixed(3))],
    rateRange: calculateIQRange(rateData[0]),
    zScoreRange: [minZScore, maxZScore],
    rateMean: rateMean,
    expectedMean: expectedMean,
    rateStdDev: rateStdDev,
    totalPopulation: totalPopulation,
    maxPopulation: maxPopulation,
  };
};

export const calcSurpriseNewData = (summary, newData) => {
  const rateMean = summary.rateMean;
  const rateStdDev = summary.rateStdDev;
  const totalPopulation = summary.totalPopulation;

  let pMs = [1],
    pSMs = [];
  let kl,
    pMDs = [],
    diffs = [0],
    zScore = 0;

  newData.forEach((d) => {
    zScore =
      (+d.rate - rateMean) /
      (rateStdDev / Math.sqrt(+d.population / totalPopulation));
    d.zScore = (+d.rate - rateMean) / rateStdDev;
    pSMs.push(2 * (1 - cdf(Math.abs(zScore))));
  });


  newData.forEach((d, i) => {
    if (+d.rate == 0 || d.population == undefined) {
      console.log(d);
      d.surprise = 0;
      console.log("test")
    } else {
      diffs[0] = +d.rate - rateMean;
      pMDs[0] = pMs[0] * pSMs[i];
      kl = 0;
      let voteSum = 0;
      kl += +pMDs[0] * (Math.log(+pMDs[0] / +pMs[0]) / Math.log(2));
      if (Number.isNaN(kl)) {
        d.surprise = 0;
      } else {
        voteSum += diffs[0] * pMs[0];
        let surprise = voteSum >= 0 ? +Math.abs(kl) : -1 * +Math.abs(kl);
        d.surprise = +surprise;
      }
    }
  });

  return newData;
};

export default calcSurprise;
