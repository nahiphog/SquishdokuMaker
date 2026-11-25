import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

// Exercise the actual solver without exposing internal helpers in the website API.
const source = (await readFile(new URL('../src/walkthrough.ts', import.meta.url), 'utf8'))
  .replace("import './style.css';", '') + '\nexport { findHiddenQuadruple, solveSteps, setTuples };';
const bundle = await build({
  stdin: { contents: source, resolveDir: fileURLToPath(new URL('../src/', import.meta.url)), sourcefile: 'walkthrough.ts', loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { findHiddenQuadruple, solveSteps, setTuples } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);

const emptyBoard = () => Array.from({ length: 7 }, () => Array(7).fill(0));
const emptyNotes = () => Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => []));

test('seven-cell rows and columns cannot imply a hidden quadruple', () => {
  for (const transpose of [false, true]) {
    const notes = emptyNotes();
    [[2, 4, 8], [2, 4], [3, 4, 6], [4, 6, 8]].forEach((values, index) => {
      if (transpose) notes[index + 2][0] = values;
      else notes[0][index + 2] = values;
    });
    assert.equal(findHiddenQuadruple(emptyBoard(), notes, false), null);
  }
});

test('a hidden quadruple is still found in a nine-cell region', () => {
  const notes = emptyNotes();
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([row, col], index) => { notes[row][col] = [index + 1, 5]; });
  const result = findHiddenQuadruple(emptyBoard(), notes, false);
  assert.deepEqual(result?.digits, [1, 2, 3, 4]);
  assert.equal(result?.affected.size, 9);
  assert.equal(result?.removed.size, 4);
});

test('Set logic houses are considered only when enabled', () => {
  const notes = emptyNotes();
  [0, 3, 5, 8].forEach((index, digit) => { const [row, col] = setTuples[0][index]; notes[row][col] = [digit + 1, 5]; });
  assert.equal(findHiddenQuadruple(emptyBoard(), notes, false), null);
  const result = findHiddenQuadruple(emptyBoard(), notes, true);
  assert.deepEqual(result?.digits, [1, 2, 3, 4]);
  assert.equal(result?.removed.size, 4);
});

test('reported puzzle has no hidden quadruple in a seven-cell house', () => {
  const input = '57....1........3...7.1..3..6.8...9........7....24';
  const puzzle = Array.from({ length: 7 }, (_, row) => Array.from(input.slice(row * 7, row * 7 + 7), digit => Number(digit) || 0));
  for (const useSetLogic of [true, false]) {
    const walk = solveSteps(puzzle, undefined, useSetLogic);
    assert.ok(walk, `walkthrough exists with Set logic ${useSetLogic}`);
    assert.ok(walk.steps.at(-1).board.flat().every(Boolean));
    for (const step of walk.steps.filter(step => step.kind === 'Hidden Quadruple')) {
      assert.equal(step.affected.size, 9, step.description);
    }
  }
});
