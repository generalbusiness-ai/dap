import { fileURLToPath } from 'node:url';
import { emit } from './compiler.ts';
import { sale } from './declarations/sale.ts';
import { booking } from './declarations/booking.ts';
import { discussion } from './declarations/discussion.ts';
for (const d of [sale, booking, discussion]) console.log(JSON.stringify({ model: d.model, ...emit(d, fileURLToPath(new URL('./generated/' + d.model + '.ts', import.meta.url))) }));
