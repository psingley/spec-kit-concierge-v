import { screens } from './screens.config';
import { verifyScreen } from './verify/verifyScreen';
import { writeJsonReport } from './report/writeJsonReport';

const names = process.argv.slice(2);
const selected = names.length > 0 ? names : screens.map((screen) => screen.name);
const results = [];
for (const name of selected) {
  const result = await verifyScreen(name);
  results.push(result);
  console.log(`${result.status} ${result.name} score=${result.priorityScore} residual=${result.pixelResidual}%`);
}
await writeJsonReport(results);
