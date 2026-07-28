# Real Analysis Game data and images

The course rendered at `/games/real-analysis-game` is generated from
[alexkontorovich/realanalysisgame](https://github.com/alexkontorovich/realanalysisgame)
at commit `930c38333b2edcc3ad27c5f68b9f09210cfaaf62`.

Real Analysis, The Game was designed and implemented by Alex Kontorovich for
Rutgers University Math 311H. Its upstream credits also thank Jon Eugster,
Heather Macbeth, Michael Stoll, and the students of 311H.

The project is distributed under the Apache License 2.0; the complete license
text is included at [`../../LICENSE`](../../LICENSE). Generated course data
preserves the active world graph, lesson copy, statements, hints, solutions,
inventories, source paths, and version metadata. Web image files in
`public/game-assets/real-analysis/` are copied from the pinned upstream
snapshot.

Refresh the generated data after cloning the game:

```bash
npm run import:real-analysis -- /path/to/realanalysisgame
```

The multi-game catalog, local progress integration, and browser-runtime status
handling are additions in this repository. They are not part of the upstream
course or Lean4Game.
