import './style.css';

export type Board = number[][];
type MoveKind = 'Snyder notation' | 'Naked Single' | 'Hidden Single' | 'Brute Force';
type Notes = number[][][];
type Step = { board: Board; notes: Notes; givens: boolean[][]; removed: Set<string>; affected: Set<string>; placed: [number, number] | null; kind: MoveKind; description: string };

const regions: number[][][] = [
  [[1], [1], [1, 2], [2], [2, 3], [3], [3]], [[1], [1], [1, 2], [2], [2, 3], [3], [3]],
  [[1, 4], [1, 4], [1, 2, 4, 5], [2, 5], [2, 3, 5, 6], [3, 6], [3, 6]], [[4], [4], [4, 5], [5], [5, 6], [6], [6]],
  [[4, 7], [4, 7], [4, 5, 7, 8], [5, 8], [5, 6, 8, 9], [6, 9], [6, 9]], [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
  [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
];
const regionCells = new Map<number, Array<[number, number]>>();
regions.forEach((row, r) => row.forEach((cellRegions, c) => cellRegions.forEach((region) => { const cells = regionCells.get(region) ?? []; cells.push([r, c]); regionCells.set(region, cells); })));
const units: Array<Array<[number, number]>> = [
  ...Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, col) => [row, col] as [number, number])),
  ...Array.from({ length: 7 }, (_, col) => Array.from({ length: 7 }, (_, row) => [row, col] as [number, number])),
  ...Array.from(regionCells.values()),
];
const clone = (board: Board): Board => board.map((row) => [...row]);
function valid(board: Board, row: number, col: number, value: number): boolean { return !board[row].some((cell) => cell === value) && !board.some((line) => line[col] === value) && regions[row][col].every((region) => (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value)); }
function candidates(board: Board, row: number, col: number): number[] { return Array.from({ length: 9 }, (_, index) => index + 1).filter((value) => valid(board, row, col, value)); }
function nextCell(board: Board): [number, number, number[]] | null { let best: [number, number, number[]] | null = null; for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (!board[row][col]) { const options = candidates(board, row, col); if (!options.length) return [row, col, []]; if (!best || options.length < best[2].length) best = [row, col, options]; } return best; }
function solve(board: Board): boolean { const cell = nextCell(board); if (!cell) return true; const [row, col, options] = cell; for (const value of options) { board[row][col] = value; if (solve(board)) return true; board[row][col] = 0; } return false; }
function findNaked(board: Board): [number, number, number] | null { for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (!board[row][col]) { const options = candidates(board, row, col); if (options.length === 1) return [row, col, options[0]]; } return null; }
function findHidden(board: Board): [number, number, number] | null { for (const unit of units) for (let digit = 1; digit <= 9; digit++) { const spots = unit.filter(([row, col]) => !board[row][col] && candidates(board, row, col).includes(digit)); if (spots.length === 1) return [...spots[0], digit]; } return null; }
function position(row: number, col: number): string { return `r${row + 1}c${col + 1}`; }
function createNotes(board: Board): Notes { return board.map((row, r) => row.map((value, c) => value ? [] : candidates(board, r, c))); }
function noteKey(row: number, col: number, digit: number): string { return `${row}:${col}:${digit}`; }
function cellKey(row: number, col: number): string { return `${row}:${col}`; }
function affectedCells(row: number, col: number): Set<string> {
  const affected = new Set<string>();
  for (let index = 0; index < 7; index++) { affected.add(cellKey(row, index)); affected.add(cellKey(index, col)); }
  regions[row][col].forEach((region) => (regionCells.get(region) ?? []).forEach(([r, c]) => affected.add(cellKey(r, c))));
  return affected;
}
function removedNotes(before: Notes, after: Notes, board: Board): Set<string> {
  const removed = new Set<string>();
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
    if (board[row][col]) continue;
    before[row][col].forEach((digit) => { if (!after[row][col].includes(digit)) removed.add(noteKey(row, col, digit)); });
  }
  return removed;
}
function solveSteps(initial: Board): { steps: Step[]; tally: Map<MoveKind, number>; rating: number } | null {
  const solution = clone(initial); if (!solve(solution)) return null;
  const board = clone(initial); const givens = initial.map((row) => row.map(Boolean)); let notes = createNotes(board);
  const steps: Step[] = [{ board: clone(board), notes, givens, removed: new Set(), affected: new Set(), placed: null, kind: 'Snyder notation', description: 'Step 0: candidate notation is placed in every empty cell.' }];
  const tally = new Map<MoveKind, number>(); let rating = 0;
  while (board.some((row) => row.some((value) => !value))) {
    const naked = findNaked(board); const hidden = naked ? null : findHidden(board);
    let row: number; let col: number; let value: number; let kind: MoveKind;
    if (naked) { [row, col, value] = naked; kind = 'Naked Single'; rating += 10; }
    else if (hidden) { [row, col, value] = hidden; kind = 'Hidden Single'; rating += 20; }
    else { const cell = nextCell(board); if (!cell) break; [row, col] = cell; value = solution[row][col]; kind = 'Brute Force'; rating += 10000; }
    board[row][col] = value; tally.set(kind, (tally.get(kind) ?? 0) + 1);
    const nextNotes = createNotes(board); const removed = removedNotes(notes, nextNotes, board); notes = nextNotes;
    const removalNote = removed.size ? ` ${removed.size} Snyder notation${removed.size === 1 ? ' is' : 's are'} removed in red.` : '';
    const note = kind === 'Brute Force' ? `No available technique could progress; brute force places ${value} in ${position(row, col)} (+10,000).${removalNote}` : `${kind}: place ${value} in ${position(row, col)}.${removalNote}`;
    steps.push({ board: clone(board), notes, givens, removed, affected: affectedCells(row, col), placed: [row, col], kind, description: note });
  }
  return { steps, tally, rating };
}
function renderBoard(step: Step): HTMLElement {
  const grid = document.createElement('div'); grid.className = 'grid walkthrough-grid';
  const notes = step.notes;
  step.board.forEach((row, r) => row.forEach((value, c) => {
    const cell = document.createElement('div'); cell.className = 'cell'; if (r === 2 || r === 4) cell.classList.add('seam-row'); if (c === 2 || c === 4) cell.classList.add('seam-column');
    if (step.affected.has(cellKey(r, c))) cell.classList.add('affected-cell');
    if (step.placed?.[0] === r && step.placed?.[1] === c) cell.classList.add('placed-cell');
    if (value && !step.givens[r][c]) cell.classList.add('solved-cell');
    if (!value) {
      cell.classList.add('snyder-cell');
      const digits = new Set([...notes[r][c], ...Array.from(step.removed).filter((key) => key.startsWith(`${r}:${c}:`)).map((key) => Number(key.split(':')[2]))]);
      digits.forEach((digit) => { const mark = document.createElement('span'); mark.textContent = String(digit); mark.style.gridArea = `${Math.ceil(digit / 3)} / ${((digit - 1) % 3) + 1}`; if (step.removed.has(noteKey(r, c, digit))) mark.classList.add('removed-snyder'); cell.append(mark); });
    }
    else cell.textContent = value ? String(value) : '';
    grid.append(cell);
  }));
  return grid;
}
export function mountWalkthrough(container: HTMLElement, puzzle: Board, heading = 'Solution walkthrough'): void {
  const walk = solveSteps(puzzle); container.replaceChildren();
  if (!walk) { container.textContent = 'A walkthrough is unavailable because this puzzle has no solution.'; return; }
  let current = 0; const section = document.createElement('section'); section.className = 'walkthrough';
  const title = document.createElement('h2'); title.textContent = heading; const meta = document.createElement('p'); meta.className = 'walkthrough-meta';
  const tally = [...walk.tally.entries()].map(([kind, count]) => `${count} × ${kind}`).join(' · ') || 'No placements required'; const level = walk.rating >= 10000 ? 'Brute force' : walk.rating > 100 ? 'Intermediate' : 'Beginner';
  meta.textContent = `Difficulty: ${level} · Rating: ${walk.rating} · ${tally}`;
  const stepTable = document.createElement('table'); stepTable.className = 'walkthrough-steps';
  const tableHead = document.createElement('thead'); const headingRow = document.createElement('tr');
  ['Technique', 'Steps'].forEach((label) => { const heading = document.createElement('th'); heading.scope = 'col'; heading.textContent = label; headingRow.append(heading); });
  tableHead.append(headingRow); const tableBody = document.createElement('tbody');
  walk.steps.forEach((step, index) => {
    const row = document.createElement('tr'); const technique = document.createElement('td'); const details = document.createElement('td');
    technique.textContent = step.kind; details.textContent = `${index}. ${step.description}`; row.append(technique, details); tableBody.append(row);
  });
  stepTable.append(tableHead, tableBody);
  const board = document.createElement('div'); const description = document.createElement('p'); description.className = 'walkthrough-description';
  const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = String(walk.steps.length - 1); slider.value = '0'; slider.setAttribute('aria-label', 'Walkthrough step');
  const counter = document.createElement('span'); counter.className = 'step-counter';
  const controls = document.createElement('div'); controls.className = 'walkthrough-controls';
  const actions: Array<[string, () => number]> = [['<<', () => 0], ['<', () => Math.max(0, current - 1)], ['>', () => Math.min(walk.steps.length - 1, current + 1)], ['>>', () => walk.steps.length - 1]];
  const render = (): void => { board.replaceChildren(renderBoard(walk.steps[current])); description.textContent = walk.steps[current].description; slider.value = String(current); counter.textContent = `Step ${current} of ${walk.steps.length - 1}`; };
  actions.forEach(([label, getStep]) => { const button = document.createElement('button'); button.className = 'walk-button'; button.type = 'button'; button.textContent = label; button.addEventListener('click', () => { current = getStep(); render(); }); controls.append(button); });
  slider.addEventListener('input', () => { current = Number(slider.value); render(); });
  section.append(title, meta, stepTable, board, description, slider, controls, counter); container.append(section); render();
}
