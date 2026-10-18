import {write} from './database';
import {clampCount, contentById} from './content';
// The database owns the remaining count. UI acknowledges a mutation only after commit.
export const decrementCounter = (id: string) =>
  write(async tx => {
    if (!contentById.has(id)) throw new Error('unknown_counter');
    const rows = (
      await tx.execute(
        'UPDATE counters SET remaining=MAX(0,remaining-1), updated_at=? WHERE content_id=? RETURNING remaining',
        [Date.now(), id],
      )
    ).rows;
    if (!rows.length) throw new Error('missing_counter');
    return rows[0].remaining as number;
  });
export const resetCounters = (counts: Record<string, number>) =>
  write(async tx => {
    const result: Record<string, number> = {};
    for (const [id, value] of Object.entries(counts)) {
      const item = contentById.get(id);
      if (!item) throw new Error('unknown_counter');
      const remaining = clampCount(value, item.repeat ?? 0);
      const rows = (
        await tx.execute(
          'UPDATE counters SET remaining=?, updated_at=? WHERE content_id=? RETURNING remaining',
          [remaining, Date.now(), id],
        )
      ).rows;
      if (!rows.length) throw new Error('missing_counter');
      result[id] = remaining;
    }
    return result;
  });
