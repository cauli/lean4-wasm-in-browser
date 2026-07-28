# Natural Number Game data

The game metadata rendered at `/game` is generated from
[leanprover-community/NNG4](https://github.com/leanprover-community/NNG4) at
commit `727e4d219838eeb7f3945d2e9a0539f244d50540`.

NNG4 is licensed under the Apache License 2.0. The complete license text is
included in this repository at [`../../LICENSE`](../../LICENSE); the pinned
upstream copy is available in the
[NNG4 repository](https://github.com/leanprover-community/NNG4/blob/main/LICENSE).
The generated data preserves world titles, level titles, introductions,
statements, conclusions, hints, inventories, and upstream source paths.

The Natural Number Game is by Kevin Buzzard and Mohammad Pedramfar, with
Patrick Massot's NNG4 prototype and contributions from the Lean community.
Kevin Buzzard maintains the current NNG4 game. The browser layout is based on
[Lean4Game](https://github.com/leanprover-community/lean4game), primarily
developed by Alexander Bentkamp and Jon Eugster.

Refresh the generated data after cloning NNG4:

```bash
npm run import:nng4 -- /path/to/NNG4
```

The browser-specific proof prelude and verifier are original integration code
in this repository. They are not part of upstream NNG4 or Lean4Game.
