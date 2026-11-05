import fs from 'node:fs';
import { normalizeWarnotoSnapshot } from '../server/_lib/warnotoImport.js';
const snapshot=normalizeWarnotoSnapshot(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
console.log(JSON.stringify({uit:snapshot.uit.length,upt:snapshot.upt.length,gi:snapshot.gi.length}));
