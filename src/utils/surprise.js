import { stdev, mean } from "stats-lite";
import * as d3 from "d3";
import * as math from "mathjs";
import { jStat } from "jstat";

const cdf = (x) => {
  return jStat.normal.cdf(x, 0, 1);
};

const getRate = (dataObj, isElicited) => {
  const rateData = [];
  const rateUData = [];
  const expectedData = [];
  const populationData = [];
  for (const fipsCode in dataObj) {
    rateData.push(+dataObj[fipsCode].rate);
    if (+dataObj[fipsCode].rateU !== 0)
      rateUData.push(+dataObj[fipsCode].rateU);
    
    if (isElicited) {
      expectedData.push(+dataObj[fipsCode].expectedRate);
    } else {
      expectedData.push(0);
      dataObj[fipsCode].expectedRate = 0;
    }
    populationData.push(+dataObj[fipsCode].population);
  }
  return [rateData, rateUData, expectedData, populationData];
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
  const rateUMean = mean(rateData[1]);
  const expectedMean = mean(rateData[2]); //Use mean from historical data
  const rateStdDev = stdev(rateData[0]);
  const rateUStdDev = stdev(rateData[1]);
  const totalPopulation = math.sum(rateData[3]);
  const maxPopulation = math.max(rateData[3]);
  const surpriseData = [], surpriseDatay = [], surpriseDataz = [];

  let pMs = [1],
    pSMx = [], pSMy = [], pSMz = [];
  let klx, kly, klz,
    pMDx = [], pMDy = [], pMDz = [],
    diffsx = [0], diffsy = [0], diffsz = [0],
    s = 0,
    sx = 0;

  let minZScore = 100;
  let maxZScore = -100;
  let minZUScore = 100;
  let maxZUScore = -100;
  let zScores = [];
  let zUScores = [];

  for (const fipsCode in data) {
    if (+data[fipsCode].rate !== fipsCode) {
      s = (+data[fipsCode].rate - rateMean) /
          (rateStdDev /
            Math.sqrt(+data[fipsCode].population / totalPopulation));
      sx = (+data[fipsCode].rateU - rateUMean) /
              (rateUStdDev /
                Math.sqrt(+data[fipsCode].population / totalPopulation));
      data[fipsCode].zScore = (+data[fipsCode].rate - rateMean) / rateStdDev;
      if (+data[fipsCode].rateU !== 0)
        data[fipsCode].zUScore = (+data[fipsCode].rateU - rateUMean) / rateUStdDev;
      zScores.push(data[fipsCode].zScore);
      zUScores.push(data[fipsCode].zUScore);
      if (data[fipsCode].zScore < minZScore) {
        minZScore = data[fipsCode].zScore;
      }
      if (data[fipsCode].zScore > maxZScore) {
        maxZScore = data[fipsCode].zScore;
      }
      if (data[fipsCode].zUScore < minZUScore) {
        minZUScore = data[fipsCode].zUScore;
      }
      if (data[fipsCode].zUScore > maxZUScore) {
        maxZUScore = data[fipsCode].zUScore;
      }
      let ls = 2 * (1 - cdf(Math.abs(s)));
      let lsx = 2 * (1 - cdf(Math.abs(sx)))
      pSMx.push(ls * lsx);
      pSMy.push(2 * (1 - cdf(Math.abs(s))))
      pSMz.push(2 * (1 - cdf(Math.abs(sx))))

    } else {
      pSMx.push(0);
      pSMy.push(0);
      pSMz.push(0);
    }
  }

  let iter = 0;
  for (const fipsCode in data) {
    data[fipsCode].population = +data[fipsCode].population;
    if (+data[fipsCode].rate == 0 || data[fipsCode].population == undefined) {
      data[fipsCode].surprise = 0;
      surpriseData.push(0);
    } else {
      diffsx[0] = isElicited
        ? +data[fipsCode].rate - expectedMean
        : (+data[fipsCode].rate - rateMean) + (+data[fipsCode].rateU - rateUMean);
      diffsy[0] = isElicited
        ? +data[fipsCode].rate - expectedMean
        : (+data[fipsCode].rate - rateMean);
      diffsz[0] = isElicited
        ? +data[fipsCode].rate - expectedMean
        : +data[fipsCode].rateU - rateUMean;


      pMDx[0] = pMs[0] * pSMx[iter];
      pMDy[0] = pMs[0] * pSMy[iter];
      pMDz[0] = pMs[0] * pSMz[iter];

      klx = 0, kly = 0, klz = 0;
      let voteSumx = 0, voteSumy = 0, voteSumz = 0;
      klx += +pMDx[0] * (Math.log(+pMDx[0] / +pMs[0]) / Math.log(2));
      kly += +pMDy[0] * (Math.log(+pMDy[0] / +pMs[0]) / Math.log(2));
      klz += +pMDz[0] * (Math.log(+pMDz[0] / +pMs[0]) / Math.log(2));
      if (Number.isNaN(klx) || Number.isNaN(kly) || Number.isNaN(klz)) {
        data[fipsCode].surprise = 0;
        data[fipsCode].surprisey = 0
        data[fipsCode].surprisez = 0
        surpriseData.push(0);
        surpriseDatay.push(0);
        surpriseDataz.push(0);
      } else {
        voteSumx += diffsx[0] * pMs[0];
        voteSumy += diffsy[0] * pMs[0];
        voteSumz += diffsz[0] * pMs[0];
        let surprisex = voteSumx >= 0 ? +Math.abs(klx) : -1 * +Math.abs(klx);
        let surprisey = voteSumy >= 0 ? +Math.abs(kly) : -1 * +Math.abs(kly);
        let surprisez = voteSumz >= 0 ? +Math.abs(klz) : -1 * +Math.abs(klz);
        if (isElicited) {
          data[fipsCode].surprise =
            +data[fipsCode].expectedRate == 0 ? 0 : +surprise;
          +data[fipsCode].expectedRate == 0
            ? surpriseData.push(0)
            : surpriseData.push(+surprise);
        } else {
          data[fipsCode].surprise = +surprisex;
          data[fipsCode].surprisey = +surprisey;
          data[fipsCode].surprisez = +surprisez;
          surpriseData.push(+surprisex);
          surpriseDatay.push(+surprisey);
          surpriseDataz.push(+surprisez);
        } 
      }
    }
    iter++;
  }

  let limitx =
    Math.abs(d3.extent(surpriseData)[1]) > Math.abs(d3.extent(surpriseData)[0])
      ? Math.abs(d3.extent(surpriseData)[1])
      : Math.abs(d3.extent(surpriseData)[0]);
  let limity = Math.abs(d3.extent(surpriseDatay)[1]) > Math.abs(d3.extent(surpriseDatay)[0])
      ? Math.abs(d3.extent(surpriseDatay)[1])
      : Math.abs(d3.extent(surpriseDatay)[0]);
  let limitz =
    Math.abs(d3.extent(surpriseDataz)[1]) > Math.abs(d3.extent(surpriseDataz)[0])
      ? Math.abs(d3.extent(surpriseDataz)[1])
      : Math.abs(d3.extent(surpriseDataz)[0]);
  return {
    counties: data,
    surpriseRange: [parseFloat(-limitx.toFixed(3)), parseFloat(limitx.toFixed(3))],
    surpriseyRange: [parseFloat(-limity.toFixed(3)), parseFloat(limity.toFixed(3))],
    surprisezRange: [parseFloat(-limitz.toFixed(3)), parseFloat(limitz.toFixed(3))],
    rateRange: d3.extent(rateData[0]),
    rateURange: d3.extent(rateData[1]),
    rateRangeIQR: calculateIQRange(rateData[0]),
    meanZScore: d3.mean(zScores),
    meanZUScore: d3.mean(zUScores),
    zScoreRange: [minZScore, maxZScore],
    zUScoreRange: [minZUScore, maxZUScore],
    rateMean: rateMean,
    rateUMean: rateUMean,
    expectedMean: expectedMean,
    rateStdDev: rateStdDev,
    rateUStdDev: rateUStdDev,
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
      d.surprise = 0;
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

export const calcSurpriseNewDataU = (summary, newData) => {
  const rateUMean = summary.rateUMean;
  const rateUStdDev = summary.rateUStdDev;
  const totalPopulation = summary.totalPopulation;

  let pMs = [1],
    pSMs = [];
  let kl,
    pMDs = [],
    diffs = [0],
    zScore = 0;

  newData.forEach((d) => {
    zScore =
      (+d.rate - rateUMean) /
      (rateUStdDev / Math.sqrt(+d.population / totalPopulation));
    d.zScore = (+d.rateU - rateUMean) / rateUStdDev;
    pSMs.push(2 * (1 - cdf(Math.abs(zScore))));
  });


  newData.forEach((d, i) => {
    if (+d.rate == 0 || d.population == undefined) {
      d.surprise = 0;
    } else {
      diffs[0] = (+d.rate - rateUMean);
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
