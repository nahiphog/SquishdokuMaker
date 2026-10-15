import './style.css';

type Board = number[][];

const regions: number[][][] = [
  [[1], [1], [1, 2], [2], [2, 3], [3], [3]],
  [[1], [1], [1, 2], [2], [2, 3], [3], [3]],
  [[1, 4], [1, 4], [1, 2, 4, 5], [2, 5], [2, 3, 5, 6], [3, 6], [3, 6]],
  [[4], [4], [4, 5], [5], [5, 6], [6], [6]],
  [[4, 7], [4, 7], [4, 5, 7, 8], [5, 8], [5, 6, 8, 9], [6, 9], [6, 9]],
  [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
  [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
];

const regionCells = new Map<number, Array<[number, number]>>();
regions.forEach((row, r) => row.forEach((cellRegions, c) => {
  cellRegions.forEach((region) => {
    const cells = regionCells.get(region) ?? [];
    cells.push([r, c]);
    regionCells.set(region, cells);
  });
}));

const shuffled = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function isValid(board: Board, row: number, col: number, value: number): boolean {
  if (board[row].some((cell) => cell === value)) return false;
  if (board.some((line) => line[col] === value)) return false;
  return regions[row][col].every((region) =>
    (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value),
  );
}

function candidates(board: Board, row: number, col: number): number[] {
  return Array.from({ length: 9 }, (_, index) => index + 1).filter((value) => isValid(board, row, col, value));
}

function nextCell(board: Board): [number, number, number[]] | null {
  let best: [number, number, number[]] | null = null;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      if (board[row][col] !== 0) continue;
      const options = candidates(board, row, col);
      if (options.length === 0) return [row, col, []];
      if (!best || options.length < best[2].length) best = [row, col, options];
    }
  }
  return best;
}

function solve(board: Board): boolean {
  const cell = nextCell(board);
  if (!cell) return true;
  const [row, col, options] = cell;
  for (const value of shuffled(options)) {
    board[row][col] = value;
    if (solve(board)) return true;
    board[row][col] = 0;
  }
  return false;
}

function generateBoard(): Board {
  const board = Array.from({ length: 7 }, () => Array<number>(7).fill(0));
  if (!solve(board)) throw new Error('Unable to create a Squishdoku grid.');
  return board;
}

const grid = document.querySelector<HTMLDivElement>('#grid')!;
const generateButton = document.querySelector<HTMLButtonElement>('#generate')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;

function render(board: Board): void {
  grid.replaceChildren();
  board.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (rowIndex === 2) cell.classList.add('seam-bottom');
    if (rowIndex === 4) cell.classList.add('seam-bottom');
    if (colIndex === 2) cell.classList.add('seam-right');
    if (colIndex === 4) cell.classList.add('seam-right');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Row ${rowIndex + 1}, column ${colIndex + 1}: ${value}`);
    cell.textContent = String(value);
    grid.append(cell);
  }));
}

function makeGrid(): void {
  generateButton.disabled = true;
  generateButton.classList.add('is-working');
  status.textContent = 'Finding a fresh arrangement…';
  requestAnimationFrame(() => {
    try {
      render(generateBoard());
      status.textContent = 'New completed grid generated.';
    } catch {
      status.textContent = 'That one got tangled. Please try again.';
    } finally {
      generateButton.disabled = false;
      generateButton.classList.remove('is-working');
    }
  });
}

generateButton.addEventListener('click', makeGrid);
makeGrid();
