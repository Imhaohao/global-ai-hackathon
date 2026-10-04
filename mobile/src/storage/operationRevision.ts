export type OperationStamp = { generation: number; dataRevision: number };

export function isCurrentDataOperation(
  stamp: OperationStamp,
  currentGeneration: number,
  currentDataRevision: number,
  enabled: boolean,
): boolean {
  return enabled && stamp.generation === currentGeneration && stamp.dataRevision === currentDataRevision;
}
