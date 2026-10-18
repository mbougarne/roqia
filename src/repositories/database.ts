import {open, type DB, type Transaction} from '@op-engineering/op-sqlite';

let opening: Promise<DB> | undefined;
export const database = () =>
  (opening ??= (async () => {
    const db = open({name: 'roqia-v2.sqlite'});
    const version = (await db.execute('PRAGMA user_version')).rows[0]
      .user_version as number;
    if (version > 2) throw new Error('unsupported_database_version');
    await db.execute('PRAGMA journal_mode = WAL');
    await db.execute('PRAGMA foreign_keys = ON');
    await db.transaction(async tx => {
      await tx.execute(`CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL,
      PRIMARY KEY (collection, id))`);
      await tx.execute(`CREATE TABLE IF NOT EXISTS counters (
      content_id TEXT PRIMARY KEY, remaining INTEGER NOT NULL CHECK(remaining >= 0),
      default_repeat INTEGER NOT NULL CHECK(remaining <= default_repeat),
      default_revision INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
      await tx.execute('PRAGMA user_version = 2');
    });
    return db;
  })().catch(error => {
    opening = undefined;
    throw error;
  }));

// One queue for all repository transactions, including migration and install commits.
let tail: Promise<unknown> = Promise.resolve();
export function write<T>(
  operation: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const result = tail.then(async () => {
    const db = await database();
    let value!: T;
    await db.transaction(async tx => {
      value = await operation(tx);
    });
    return value;
  });
  tail = result.catch(() => undefined);
  return result;
}
export async function readRecord<T>(
  collection: string,
  id: string,
): Promise<T | null> {
  await tail;
  const result = await (
    await database()
  ).execute('SELECT value FROM records WHERE collection = ? AND id = ?', [
    collection,
    id,
  ]);
  return result.rows.length ? JSON.parse(result.rows[0].value as string) : null;
}
export async function listRecords<T>(collection: string): Promise<T[]> {
  await tail;
  const result = await (
    await database()
  ).execute('SELECT value FROM records WHERE collection = ? ORDER BY id', [
    collection,
  ]);
  return result.rows.map(row => JSON.parse(row.value as string));
}
export async function putRecord(
  tx: Transaction,
  collection: string,
  id: string,
  value: unknown,
) {
  await tx.execute(
    'INSERT OR REPLACE INTO records(collection,id,value) VALUES(?,?,?)',
    [collection, id, JSON.stringify(value)],
  );
}
export const saveRecord = (collection: string, id: string, value: unknown) =>
  write(tx => putRecord(tx, collection, id, value));
export const removeRecord = (collection: string, id: string) =>
  write(async tx => {
    await tx.execute('DELETE FROM records WHERE collection = ? AND id = ?', [
      collection,
      id,
    ]);
  });
