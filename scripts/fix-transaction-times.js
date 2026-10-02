/**
 * One-off repair for transactions saved between 2026-10-02 00:00 (+07) and
 * the app fix: the client sent local wall-clock time without a UTC offset,
 * so the server (running UTC on Render) stored each `date` 7 hours too late.
 *
 * Dry run by default; re-run with --apply to write.
 *   node scripts/fix-transaction-times.js
 *   node scripts/fix-transaction-times.js --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');

const OFFSET_MS = 7 * 60 * 60 * 1000;
// Deploy time of BE commit b381001 (~2026-10-02 00:00 +07). Entries created
// before this saved date-only values at UTC midnight — skipped below.
const CUTOFF = new Date('2026-10-01T17:00:00.000Z');

const isMidnightUtc = (d) =>
  d.getUTCHours() === 0 &&
  d.getUTCMinutes() === 0 &&
  d.getUTCSeconds() === 0 &&
  d.getUTCMilliseconds() === 0;

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set — run from the repo root (needs .env).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.collection('transactions');

  const candidates = await col
    .find({ createdAt: { $gte: CUTOFF }, date: { $type: 'date' } })
    .toArray();

  const toFix = candidates.filter((t) => !isMidnightUtc(t.date));
  const skipped = candidates.length - toFix.length;
  console.log(
    `Transactions created after ${CUTOFF.toISOString()}: ${candidates.length}` +
      ` | to shift -7h: ${toFix.length} | skipped (UTC-midnight, date-only era): ${skipped}`,
  );

  for (const t of toFix) {
    const fixed = new Date(t.date.getTime() - OFFSET_MS);
    const label = t.note ? ` "${t.note}"` : ` [${t.category || t.type || ''}]`;
    console.log(`  ${t._id}${label}\n    ${t.date.toISOString()} -> ${fixed.toISOString()}`);
    if (process.argv.includes('--apply')) {
      await col.updateOne({ _id: t._id }, { $set: { date: fixed } });
    }
  }

  if (process.argv.includes('--apply')) {
    console.log(`\nApplied: ${toFix.length} transactions shifted -7h.`);
  } else {
    console.log('\nDry run only — nothing written. Re-run with --apply to save.');
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
