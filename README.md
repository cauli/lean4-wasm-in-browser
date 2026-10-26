# Lean 4 in your browser

The Lean 4 compiler built to WebAssembly, running in a Web Worker. No server checks your proofs.

- https://lean.cau.li is a playground.
- https://lean.cau.li/games has browser ports of Lean4Game courses: the Natural Number Game, Real Analysis and Manifold Adventure.

The WASM build comes from my Lean fork, [`cauli/lean4` @ `reinstate-wasm`](https://github.com/cauli/lean4/tree/reinstate-wasm). Its CI produces `lean.js`, `lean.wasm` and the `.olean` library tree.

## Run locally

Put the fork's build artifact in `public/lean-wasm/` (`lean.js`, `lean.wasm`, `lean-lib/`), then:

```bash
npm install
npm run dev    # http://localhost:5173
npm test       # runs the real WASM binary in Node
```

## Deploy

Pushes to `main` deploy to Cloudflare. Pages serves the app and R2 serves the binaries. See [`deploy/DEPLOY.md`](deploy/DEPLOY.md).

## Credits

The games are ports of [Lean4Game](https://github.com/leanprover-community/lean4game), the [Natural Number Game](https://github.com/leanprover-community/NNG4) and [Real Analysis, The Game](https://github.com/alexkontorovich/realanalysisgame). Their content keeps its upstream license and attribution, recorded in `third_party/`. Everything else is [Apache 2.0](LICENSE).
