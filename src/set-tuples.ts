export type SetTuple = Array<[number, number]>;

export const setTuples: SetTuple[] = [
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 2], [3, 3], [3, 4], [4, 3], [4, 4]],
  [[0, 5], [0, 6], [1, 5], [1, 6], [2, 4], [3, 2], [3, 3], [4, 2], [4, 3]],
  [[2, 3], [2, 4], [3, 3], [3, 4], [4, 2], [5, 0], [5, 1], [6, 0], [6, 1]],
  [[2, 2], [2, 3], [3, 2], [3, 3], [4, 4], [5, 5], [5, 6], [6, 5], [6, 6]],
];

const membership = new Map<string, SetTuple[]>();
setTuples.forEach((tuple) => tuple.forEach(([row, col]) => {
  const key = `${row}:${col}`; const tuples = membership.get(key) ?? []; tuples.push(tuple); membership.set(key, tuples);
}));

export function respectsSetTuples(board: number[][], row: number, col: number, value: number): boolean {
  return (membership.get(`${row}:${col}`) ?? []).every((tuple) => tuple.every(([r, c]) => (r === row && c === col) || board[r][c] !== value));
}
