# Squishdoku

[Open Squishdoku](https://nahiphog.github.io/SquishdokuMaker/)

Squishdoku is a 7×7 Sudoku variant with overlapping 3×3 regions. This website can generate, build, verify, solve, and simulate Squishdoku puzzles entirely in the browser.

## Rules

Place digits **1–9** in the 49 cells. A digit cannot repeat within:

- a row;
- a column; or
- any of the overlapping 3×3 regions indicated by the four dashed seams through rows 3 and 5 and columns 3 and 5.

The optional **Set logic** rule adds eight specified nine-cell sets. Each of these sets must contain the digits 1–9 exactly once. It is enabled by default in solution walkthroughs and can be switched off to compare solution paths.

## Use the website

Use the **Pages** menu in the header to reach the tools below.

| Page | What it does |
| --- | --- |
| **Generate** | Generates a completed grid, then digs a uniquely solvable puzzle. Choose either single-cell or rotationally symmetric dual-cell digging. Compare difficulty, hardest technique, and total steps with Set logic on or off. |
| **Custom build** | Select at least eight clue positions, choose a difficulty range, and build a random uniquely solvable puzzle that uses exactly those positions. |
| **Verify** | Paste a 49-character puzzle string or enter digits into the grid. The page checks the number of solutions; unique puzzles show a completed grid, while non-unique puzzles show two solutions and highlight their differences. |
| **Simulation** | Runs many dug-puzzle trials and reports clue-count tallies, generation time, and qualifying grids. |
| **Simulation pattern** | Counts completed-grid `SquishyTally` patterns: the descending tally of digits 1–9. |
| **Simulation Difficulty** | Tallies logical difficulty ratings below 10,000 and can list puzzles above a chosen threshold. |
| **Simulation steps** | Tallies logical walkthrough lengths for eligible puzzles. |
| **Simulation subset** | Searches for sub-10,000-difficulty puzzles using a Naked or Hidden Quadruple. |
| **Techniques** | Lists the solver techniques and their explanations. |

### Puzzle strings and exports

A grid string has **49 characters**, read left-to-right and top-to-bottom. Use digits for givens and `.` for an empty cell. For example:

```text
57....1........3...7.1..3..6.8...9........7....24
```

Generated and verified grids can be copied as puzzle strings. Most generated grids can also be copied as images.

### Solution walkthroughs

Each walkthrough begins at Step 0 with Snyder notation (candidate pencil marks). Use the slider or the `<<`, `<`, `>`, and `>>` controls to navigate. The walkthrough displays candidate removals in red, the placed digit in blue, and the newly filled cell in yellow. If the available logical techniques cannot continue, the solver records a target-verified **Brute Force** move and adds 10,000 to the difficulty rating.

## Supported techniques

The current logical priority includes House Single, Naked Single, Locked Candidates, Naked Pair, Naked Triple, Naked Quadruple, and Hidden Quadruple. Hidden quadruples are evaluated only in complete nine-cell regions and Set logic houses; seven-cell rows and columns do not require every digit 1–9 and therefore cannot justify a hidden subset.

See the in-app **Techniques** page for fuller descriptions.

## Develop locally

This project uses TypeScript and Vite.

```bash
npm ci
npm run dev
```

Then open the local URL printed by Vite.

### Checks

```bash
npm test
npm run build
```

`npm test` includes regression coverage for solver deductions, including hidden-quadruple behavior in seven-cell and nine-cell houses. `npm run build` creates the static site in `dist/`, which is used by GitHub Pages.

## Publishing

Changes are intentionally kept local by the development workflow. To update the live GitHub Pages site, review the changed source and `dist/` files, then commit and push them yourself.
