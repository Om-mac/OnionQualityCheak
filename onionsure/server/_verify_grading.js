/* Verify the grading engine now responds to real inputs. */
const ai = require('./ai');

const cases = [
  {
    name: 'A. Clean lot (vision 94, gas LOW/87, env 90)',
    vision: { visionScore: 94, confidence: 0.95, counts: { healthy: 17, damaged: 0, rotten: 1, sprouted: 0, undersized: 0 } },
    gas: { stage: 'LOW', gasScore: 87, confidence: 0.92, readings: { c2h4: 0.22, nh3: 0.11, moisture: 14.0 } },
    environment: { environmentScore: 90, confidence: 0.95, temperature: 24.5, humidity: 62 },
  },
  {
    name: 'B. Early spoilage (vision looks CLEAN 94, gas HIGH/46)',
    vision: { visionScore: 94, confidence: 0.95, counts: { healthy: 17, damaged: 0, rotten: 1, sprouted: 0, undersized: 0 } },
    gas: { stage: 'HIGH', gasScore: 46, confidence: 0.90, readings: { c2h4: 1.6, nh3: 0.8, moisture: 14.0 } },
    environment: { environmentScore: 90, confidence: 0.95, temperature: 24.5, humidity: 62 },
  },
  {
    name: 'C. Bad lot (vision 42, heavy rot, gas HIGH)',
    vision: { visionScore: 42, confidence: 0.9, counts: { healthy: 40, damaged: 20, rotten: 22, sprouted: 10, undersized: 8 } },
    gas: { stage: 'HIGH', gasScore: 40, confidence: 0.9, readings: { c2h4: 1.7, nh3: 0.9, moisture: 14.0 } },
    environment: { environmentScore: 60, confidence: 0.9, temperature: 30, humidity: 80 },
  },
  {
    name: 'D. Mid lot (vision 88, gas MEDIUM/76, 16% defects, 3 rotten) -> URS band',
    vision: { visionScore: 88, confidence: 0.93, counts: { healthy: 84, damaged: 8, rotten: 3, sprouted: 3, undersized: 2 } },
    gas: { stage: 'MEDIUM', gasScore: 76, confidence: 0.9, readings: { c2h4: 0.5, nh3: 0.2, moisture: 14.5 } },
    environment: { environmentScore: 85, confidence: 0.9, temperature: 25, humidity: 65 },
  },
];

let fails = 0;
for (const c of cases) {
  const r = ai.fuse({ vision: c.vision, gas: c.gas, environment: c.environment });
  console.log('─'.repeat(72));
  console.log(c.name);
  console.log(`  grade=${r.grade}  score=${r.qualityScore}  risk=${r.spoilageRisk}  earlyAlert=${r.earlySpoilageAlert}`);
  console.log(`  vision=${r.visionScore} gas=${r.gasScore} env=${r.environmentalScore} sensor=${r.sensorScore} conf=${r.confidence}`);
  console.log(`  split: A=${r.gradeAPercentage}% URS=${r.ursPercentage}% REJ=${r.rejectedPercentage}% | defects=${r.totalDefectsPercentage}%`);
  console.log(`  inputs: ${JSON.stringify(r.inputSources)}`);
}

/* Assertions — the whole point is that different inputs give different grades. */
const g = (c) => ai.fuse({ vision: c.vision, gas: c.gas, environment: c.environment });
const expect = (label, actual, want) => {
  const ok = actual === want;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${actual}, expected ${want}`);
};

console.log('\n' + '='.repeat(72));
console.log('ASSERTIONS');
expect('A grade', g(cases[0]).grade, 'GRADE A');
expect('A risk', g(cases[0]).spoilageRisk, 'LOW');
expect('A earlyAlert', g(cases[0]).earlySpoilageAlert, false);
expect('B grade (camera clean, gas bad)', g(cases[1]).grade, 'URS');
expect('B risk', g(cases[1]).spoilageRisk, 'HIGH');
expect('B earlyAlert', g(cases[1]).earlySpoilageAlert, true);
expect('C grade', g(cases[2]).grade, 'REJECTED');
expect('D grade', g(cases[3]).grade, 'URS');

const scores = cases.map((c) => g(c).qualityScore);
console.log(`\nscores across scenarios: ${scores.join(', ')}`);
const allDistinct = new Set(scores).size > 1;
console.log(`${allDistinct ? 'PASS' : 'FAIL'}  scores respond to inputs (not constant)`);
if (!allDistinct) fails++;

console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'}`);
process.exit(fails === 0 ? 0 : 1);
