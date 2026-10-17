import './style.css';
import { respectsSetTuples, setTuples } from './set-tuples';

export type Board = number[][];
type MoveKind = 'Snyder notation' | 'Naked Single' | 'House Single' | 'Locked Candidates' | 'Naked Pair' | 'Naked Triple' | 'Naked Quadruple' | 'Hidden Quadruple' | 'Brute Force';
type Notes = number[][][];
type Step = { board: Board; notes: Notes; givens: boolean[][]; removed: Set<string>; affected: Set<string>; placed: [number, number] | null; house?: Set<string>; kind: MoveKind; description: string };
type HouseSingle = { row: number; col: number; value: number; house: Array<[number, number]> };
const techniqueDifficulty: Record<MoveKind, number> = {
  'Snyder notation': 0,
  'Naked Single': 10,
  'House Single': 20,
  'Locked Candidates': 40,
  'Naked Pair': 50,
  'Naked Triple': 60,
  'Naked Quadruple': 70,
  'Hidden Quadruple': 80,
  'Brute Force': 10000,
};

const regions: number[][][] = [
  [[1], [1], [1, 2], [2], [2, 3], [3], [3]], [[1], [1], [1, 2], [2], [2, 3], [3], [3]],
  [[1, 4], [1, 4], [1, 2, 4, 5], [2, 5], [2, 3, 5, 6], [3, 6], [3, 6]], [[4], [4], [4, 5], [5], [5, 6], [6], [6]],
  [[4, 7], [4, 7], [4, 5, 7, 8], [5, 8], [5, 6, 8, 9], [6, 9], [6, 9]], [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
  [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
];
const regionCells = new Map<number, Array<[number, number]>>();
regions.forEach((row, r) => row.forEach((cellRegions, c) => cellRegions.forEach((region) => { const cells = regionCells.get(region) ?? []; cells.push([r, c]); regionCells.set(region, cells); })));
const regionUnits = [...regionCells.values()];
const baseUnits: Array<Array<[number, number]>> = [
  ...Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, col) => [row, col] as [number, number])),
  ...Array.from({ length: 7 }, (_, col) => Array.from({ length: 7 }, (_, row) => [row, col] as [number, number])),
  ...regionUnits,
];
const unitsFor = (useSetLogic: boolean): Array<Array<[number, number]>> => useSetLogic ? [...baseUnits, ...setTuples] : baseUnits;
const clone = (board: Board): Board => board.map((row) => [...row]);
function valid(board: Board, row: number, col: number, value: number, useSetLogic = true): boolean { return !board[row].some((cell) => cell === value) && !board.some((line) => line[col] === value) && regions[row][col].every((region) => (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value)) && (!useSetLogic || respectsSetTuples(board, row, col, value)); }
function candidates(board: Board, row: number, col: number, useSetLogic = true): number[] { return Array.from({ length: 9 }, (_, index) => index + 1).filter((value) => valid(board, row, col, value, useSetLogic)); }
function nextCell(board: Board, useSetLogic = true): [number, number, number[]] | null { let best: [number, number, number[]] | null = null; for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (!board[row][col]) { const options = candidates(board, row, col, useSetLogic); if (!options.length) return [row, col, []]; if (!best || options.length < best[2].length) best = [row, col, options]; } return best; }
function solve(board: Board, useSetLogic = true): boolean { const cell = nextCell(board, useSetLogic); if (!cell) return true; const [row, col, options] = cell; for (const value of options) { board[row][col] = value; if (solve(board, useSetLogic)) return true; board[row][col] = 0; } return false; }
function findNaked(board: Board, notes: Notes): [number, number, number] | null { for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (!board[row][col] && notes[row][col].length === 1) return [row, col, notes[row][col][0]]; return null; }
function findHouseSingle(board: Board, notes: Notes): HouseSingle | null { for (const tuple of setTuples) for (let digit = 1; digit <= 9; digit++) { if (tuple.some(([row, col]) => board[row][col] === digit)) continue; const spots = tuple.filter(([row, col]) => !board[row][col] && notes[row][col].includes(digit)); if (spots.length === 1) return { row: spots[0][0], col: spots[0][1], value: digit, house: tuple }; } return null; }
function sameCell(left: [number, number], right: [number, number]): boolean { return left[0] === right[0] && left[1] === right[1]; }
function findLockedCandidates(board: Board, notes: Notes, useSetLogic: boolean): { digit: number; source: Array<[number, number]>; target: Array<[number, number]>; removed: Set<string>; affected: Set<string> } | null {
  for (const source of useSetLogic ? [...regionUnits, ...setTuples] : regionUnits) for (let digit = 1; digit <= 9; digit++) {
    if (source.some(([row, col]) => board[row][col] === digit)) continue;
    const spots = source.filter(([row, col]) => !board[row][col] && notes[row][col].includes(digit));
    if (!spots.length) continue;
    for (const target of unitsFor(useSetLogic)) {
      if (target === source) continue;
      const intersection = target.filter((cell) => source.some((sourceCell) => sameCell(sourceCell, cell)));
      if (!intersection.length || !spots.every((spot) => intersection.some((cell) => sameCell(cell, spot)))) continue;
      const removed = new Set<string>();
      target.filter((cell) => !source.some((sourceCell) => sameCell(sourceCell, cell))).forEach(([row, col]) => { if (!board[row][col] && notes[row][col].includes(digit)) removed.add(noteKey(row, col, digit)); });
      if (removed.size) return { digit, source, target, removed, affected: new Set([...source, ...target].map(([row, col]) => cellKey(row, col))) };
    }
  }
  return null;
}
function position(row: number, col: number): string { return `r${row + 1}c${col + 1}`; }
function createNotes(board: Board, useSetLogic: boolean): Notes { return board.map((row, r) => row.map((value, c) => value ? [] : candidates(board, r, c, useSetLogic))); }
function cloneNotes(notes: Notes): Notes { return notes.map((row) => row.map((cell) => [...cell])); }
function reconcileNotes(notes: Notes, board: Board, useSetLogic: boolean): Notes { return board.map((row, r) => row.map((value, c) => value ? [] : candidates(board, r, c, useSetLogic).filter((digit) => notes[r][c].includes(digit)))); }
function noteKey(row: number, col: number, digit: number): string { return `${row}:${col}:${digit}`; }
function cellKey(row: number, col: number): string { return `${row}:${col}`; }
function affectedCells(row: number, col: number, useSetLogic: boolean): Set<string> {
  const affected = new Set<string>();
  for (let index = 0; index < 7; index++) { affected.add(cellKey(row, index)); affected.add(cellKey(index, col)); }
  regions[row][col].forEach((region) => (regionCells.get(region) ?? []).forEach(([r, c]) => affected.add(cellKey(r, c))));
  if (useSetLogic) setTuples.filter((tuple) => tuple.some(([r, c]) => r === row && c === col)).forEach((tuple) => tuple.forEach(([r, c]) => affected.add(cellKey(r, c))));
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
function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]; if (items.length < size) return [];
  const [head, ...tail] = items; return [...combinations(tail, size - 1).map((set) => [head, ...set]), ...combinations(tail, size)];
}
function findNakedSubset(board: Board, notes: Notes, size: 2 | 3 | 4, useSetLogic: boolean): { cells: Array<[number, number]>; digits: number[]; removed: Set<string>; affected: Set<string> } | null {
  for (const unit of unitsFor(useSetLogic)) {
    const eligible = unit.filter(([row, col]) => !board[row][col] && notes[row][col].length >= 2 && notes[row][col].length <= size);
    for (const cells of combinations(eligible, size)) {
      const digits = [...new Set(cells.flatMap(([row, col]) => notes[row][col]))].sort((left, right) => left - right);
      if (digits.length !== size) continue;
      const matchingCells = unit.filter(([row, col]) => !board[row][col] && notes[row][col].length > 0 && notes[row][col].every((digit) => digits.includes(digit)));
      if (matchingCells.length !== size) continue;
      const removed = new Set<string>(); const affected = new Set(unit.map(([row, col]) => cellKey(row, col)));
      for (const [row, col] of unit) if (!cells.some(([subsetRow, subsetCol]) => subsetRow === row && subsetCol === col)) {
        digits.forEach((digit) => { if (notes[row][col].includes(digit)) removed.add(noteKey(row, col, digit)); });
      }
      if (removed.size) return { cells, digits, removed, affected };
    }
  }
  return null;
}
function findHiddenQuadruple(board: Board, notes: Notes, useSetLogic: boolean): { cells: Array<[number, number]>; digits: number[]; removed: Set<string>; affected: Set<string> } | null {
  for (const unit of unitsFor(useSetLogic)) for (const digits of combinations([1, 2, 3, 4, 5, 6, 7, 8, 9], 4)) {
    const cells = unit.filter(([row, col]) => !board[row][col] && notes[row][col].some((digit) => digits.includes(digit)));
    if (cells.length !== 4 || !digits.every((digit) => cells.some(([row, col]) => notes[row][col].includes(digit)))) continue;
    const removed = new Set<string>(); cells.forEach(([row, col]) => notes[row][col].filter((digit) => !digits.includes(digit)).forEach((digit) => removed.add(noteKey(row, col, digit))));
    if (removed.size) return { cells, digits, removed, affected: new Set(unit.map(([row, col]) => cellKey(row, col))) };
  }
  return null;
}
function completedBoardIsValid(board: Board, useSetLogic: boolean): boolean {
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
    const value = board[row][col]; if (value < 1 || value > 9) return false;
    board[row][col] = 0; const okay = valid(board, row, col, value, useSetLogic); board[row][col] = value;
    if (!okay) return false;
  }
  return true;
}
function matchesGivens(puzzle: Board, solution: Board): boolean { return puzzle.every((row, r) => row.every((value, c) => !value || value === solution[r][c])); }
function boardsMatch(left: Board, right: Board): boolean { return left.every((row, r) => row.every((value, c) => value === right[r][c])); }
function removalsMatchSolution(removed: Set<string>, solution: Board): boolean { return [...removed].every((key) => { const [row, col, digit] = key.split(':').map(Number); return solution[row][col] !== digit; }); }
function solveSteps(initial: Board, target?: Board, useSetLogic = true): { steps: Step[]; tally: Map<MoveKind, number>; rating: number } | null {
  const solution = clone(target ?? initial); if (!target && !solve(solution, useSetLogic)) return null;
  if (!completedBoardIsValid(solution, useSetLogic) || !matchesGivens(initial, solution)) return null;
  const board = clone(initial); const givens = initial.map((row) => row.map(Boolean)); let notes = createNotes(board, useSetLogic);
  const steps: Step[] = [{ board: clone(board), notes, givens, removed: new Set(), affected: new Set(), placed: null, kind: 'Snyder notation', description: 'Step 0: candidate notation is placed in every empty cell.' }];
  const tally = new Map<MoveKind, number>(); let rating = 0;
  while (board.some((row) => row.some((value) => !value))) {
    const houseSingle = useSetLogic ? findHouseSingle(board, notes) : null; const naked = houseSingle ? null : findNaked(board, notes); const locked = houseSingle || naked ? null : findLockedCandidates(board, notes, useSetLogic); const subset = houseSingle || naked || locked ? null : findNakedSubset(board, notes, 2, useSetLogic) ?? findNakedSubset(board, notes, 3, useSetLogic) ?? findNakedSubset(board, notes, 4, useSetLogic); const hiddenQuad = houseSingle || naked || locked || subset ? null : findHiddenQuadruple(board, notes, useSetLogic);
    if (locked) {
      if (!removalsMatchSolution(locked.removed, solution)) return null;
      const nextNotes = cloneNotes(notes); locked.removed.forEach((key) => { const [row, col, digit] = key.split(':').map(Number); nextNotes[row][col] = nextNotes[row][col].filter((candidate) => candidate !== digit); });
      notes = nextNotes; tally.set('Locked Candidates', (tally.get('Locked Candidates') ?? 0) + 1);
      steps.push({ board: clone(board), notes, givens, removed: locked.removed, affected: locked.affected, placed: null, kind: 'Locked Candidates', description: `Locked Candidates: ${locked.digit} is confined to the overlap of complete units; ${locked.removed.size} Snyder notation${locked.removed.size === 1 ? ' is' : 's are'} removed in red.` });
      continue;
    }
    if (subset) {
      if (!removalsMatchSolution(subset.removed, solution)) return null;
      const nextNotes = cloneNotes(notes); subset.removed.forEach((key) => { const [row, col, digit] = key.split(':').map(Number); nextNotes[row][col] = nextNotes[row][col].filter((candidate) => candidate !== digit); });
      const kind: MoveKind = subset.cells.length === 2 ? 'Naked Pair' : subset.cells.length === 3 ? 'Naked Triple' : 'Naked Quadruple';
      notes = nextNotes; tally.set(kind, (tally.get(kind) ?? 0) + 1);
      const subsetCells = subset.cells.map(([row, col]) => position(row, col)).join(', ');
      const digits = subset.digits.join('/');
      steps.push({ board: clone(board), notes, givens, removed: subset.removed, affected: subset.affected, placed: null, kind, description: `${kind}: ${digits} is locked in ${subsetCells}; ${subset.removed.size} Snyder notation${subset.removed.size === 1 ? ' is' : 's are'} removed in red.` });
      continue;
    }
    if (hiddenQuad) {
      if (!removalsMatchSolution(hiddenQuad.removed, solution)) return null;
      const nextNotes = cloneNotes(notes); hiddenQuad.removed.forEach((key) => { const [row, col, digit] = key.split(':').map(Number); nextNotes[row][col] = nextNotes[row][col].filter((candidate) => candidate !== digit); }); notes = nextNotes;
      tally.set('Hidden Quadruple', (tally.get('Hidden Quadruple') ?? 0) + 1); const cells = hiddenQuad.cells.map(([row, col]) => position(row, col)).join(', ');
      steps.push({ board: clone(board), notes, givens, removed: hiddenQuad.removed, affected: hiddenQuad.affected, placed: null, kind: 'Hidden Quadruple', description: `Hidden Quadruple: ${hiddenQuad.digits.join('/')} is confined to ${cells}; ${hiddenQuad.removed.size} Snyder notation${hiddenQuad.removed.size === 1 ? ' is' : 's are'} removed in red.` }); continue;
    }
    let row: number; let col: number; let value: number; let kind: MoveKind;
    if (houseSingle && houseSingle.value === solution[houseSingle.row][houseSingle.col]) { ({ row, col, value } = houseSingle); kind = 'House Single'; rating += 20; }
    else if (naked && naked[2] === solution[naked[0]][naked[1]]) { [row, col, value] = naked; kind = 'Naked Single'; rating += 10; }
    else { const cell = nextCell(board, useSetLogic); if (!cell) return null; [row, col] = cell; value = solution[row][col]; if (!notes[row][col].includes(value)) return null; kind = 'Brute Force'; rating += 10000; }
    board[row][col] = value; tally.set(kind, (tally.get(kind) ?? 0) + 1);
    const nextNotes = reconcileNotes(notes, board, useSetLogic); const removed = removedNotes(notes, nextNotes, board); notes = nextNotes;
    const removalNote = removed.size ? ` ${removed.size} Snyder notation${removed.size === 1 ? ' is' : 's are'} removed in red.` : '';
    const note = kind === 'Brute Force' ? `No available technique could progress; brute force places ${value} in ${position(row, col)} (+10,000).${removalNote}` : `${kind}: place ${value} in ${position(row, col)}.${removalNote}`;
    const house = kind === 'House Single' ? new Set(houseSingle!.house.map(([houseRow, houseCol]) => cellKey(houseRow, houseCol))) : undefined;
    const houseNote = kind === 'House Single' ? ' The violet cells mark the relevant house.' : '';
    steps.push({ board: clone(board), notes, givens, removed, affected: affectedCells(row, col, useSetLogic), placed: [row, col], house, kind, description: `${note}${houseNote}` });
  }
  if (!boardsMatch(board, solution)) return null;
  return { steps, tally, rating };
}
export function getWalkthroughRating(puzzle: Board, solution?: Board): number | null { return solveSteps(puzzle, solution, true)?.rating ?? null; }
export function getWalkthroughProfile(puzzle: Board, solution: Board | undefined, useSetLogic: boolean): { rating: number; hardest: MoveKind; steps: number; techniques: MoveKind[] } | null {
  const walk = solveSteps(puzzle, solution, useSetLogic);
  // The generated puzzle has a known solution. When the logical repertoire
  // cannot produce a validated path, surface the explicit brute-force fallback
  // instead of exposing that implementation detail as "unavailable".
  if (!walk) {
    return {
      rating: 10000,
      hardest: 'Brute Force',
      steps: puzzle.flat().filter((value) => value === 0).length,
      techniques: ['Brute Force'],
    };
  }
  const techniques = [...new Set(walk.steps.map((step) => step.kind))].sort((left, right) => techniqueDifficulty[left] - techniqueDifficulty[right]);
  return { rating: walk.rating, hardest: techniques[techniques.length - 1], steps: walk.steps.length - 1, techniques };
}
function renderBoard(step: Step): HTMLElement {
  const grid = document.createElement('div'); grid.className = 'grid walkthrough-grid';
  const notes = step.notes;
  step.board.forEach((row, r) => row.forEach((value, c) => {
    const cell = document.createElement('div'); cell.className = 'cell'; if (r === 2 || r === 4) cell.classList.add('seam-row'); if (c === 2 || c === 4) cell.classList.add('seam-column');
    if (step.house?.has(cellKey(r, c))) cell.classList.add('house-cell');
    if (step.affected.has(cellKey(r, c))) cell.classList.add('affected-cell');
    if (step.placed?.[0] === r && step.placed?.[1] === c) cell.classList.add('placed-cell');
    if (value && step.givens[r][c]) cell.classList.add('given-cell');
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
export function mountWalkthrough(container: HTMLElement, puzzle: Board, heading = 'Solution walkthrough', target?: Board): void {
  let useSetLogic = true;
  const renderWalkthrough = (): void => {
    const walk = solveSteps(puzzle, target, useSetLogic); container.replaceChildren();
    if (!walk) { container.textContent = 'A validated walkthrough is unavailable for this puzzle with the selected techniques.'; return; }
    let current = 0; const section = document.createElement('section'); section.className = 'walkthrough';
    const title = document.createElement('h2'); title.textContent = heading; const setLogicControl = document.createElement('label'); setLogicControl.className = 'set-logic-toggle';
    const setLogicInput = document.createElement('input'); setLogicInput.type = 'checkbox'; setLogicInput.checked = useSetLogic; const setLogicText = document.createElement('span'); setLogicText.textContent = 'Use Set logic'; setLogicControl.append(setLogicInput, setLogicText);
    setLogicInput.addEventListener('change', () => { useSetLogic = setLogicInput.checked; renderWalkthrough(); });
    const meta = document.createElement('p'); meta.className = 'walkthrough-meta';
    const level = walk.rating >= 10000 ? 'Brute force' : walk.rating > 100 ? 'Intermediate' : 'Beginner';
    meta.textContent = `Set logic: ${useSetLogic ? 'enabled' : 'disabled'} · Difficulty: ${level} · Rating: ${walk.rating}`;
    const stepTable = document.createElement('table'); stepTable.className = 'walkthrough-steps';
    const tableHead = document.createElement('thead'); const headingRow = document.createElement('tr');
    ['Technique', 'Steps'].forEach((label) => { const heading = document.createElement('th'); heading.scope = 'col'; heading.textContent = label; headingRow.append(heading); });
    tableHead.append(headingRow); const tableBody = document.createElement('tbody'); const techniqueSteps = new Map<MoveKind, number[]>();
    walk.steps.forEach((step, index) => { const steps = techniqueSteps.get(step.kind) ?? []; steps.push(index); techniqueSteps.set(step.kind, steps); });
    [...techniqueSteps.entries()].sort(([left], [right]) => techniqueDifficulty[left] - techniqueDifficulty[right]).forEach(([kind, steps]) => {
      const row = document.createElement('tr'); const technique = document.createElement('td'); const details = document.createElement('td');
      technique.textContent = kind; details.textContent = steps.join(', '); row.append(technique, details); tableBody.append(row);
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
    section.append(title, setLogicControl, meta, stepTable, board, description, slider, controls, counter); container.append(section); render();
  };
  renderWalkthrough();
}
