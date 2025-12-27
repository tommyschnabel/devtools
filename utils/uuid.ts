export function generateUUIDs(count: number): string[] {
  const uuids: string[] = [];

  for (let i = 0; i < count; i++) {
    uuids.push(crypto.randomUUID());
  }

  return uuids;
}
