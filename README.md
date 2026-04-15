# AutoConvo

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.15.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Deploying on Render (avoid 512Mi OOM)

Angular’s production build plus `npm install` usually **exceeds Render’s 512Mi** builders. This repo is set up so you **do not build on Render**:

1. **GitHub Actions** (`.github/workflows/deploy-render-static.yml`) builds on every push to `main` and pushes only static files to branch **`render-static`**.
2. On Render, create a **Static Site** that uses branch **`render-static`**, **empty build command**, publish directory **`.`**.
3. If you use **`render.yaml`**, sync the blueprint so the static site tracks **`render-static`** (not `main`).
4. **Delete or disable** any old static site still building from **`main`**, or deploys will keep failing with out-of-memory errors.

### SPA routing + OAuth

**OAuth redirect URI (code change):** Meta now redirects to **`https://<your-site>/`** (site root with trailing slash), not `/whatsapp`. The first HTTP request always loads `index.html`, so you avoid **404** on static hosts. The app then routes client-side to `/whatsapp` with the same `code` / `state` query params.

**Meta / Facebook Login → Valid OAuth Redirect URIs** must include **exactly**:

`https://<your-subdomain>.onrender.com/`

(You can remove the old `/whatsapp` callback from Meta if you added it earlier.)

**Still recommended:** add a CDN **rewrite** so deep links like `/whatsapp` work on refresh ([Redirects and rewrites](https://render.com/docs/redirects-rewrites)):

| Action   | Source | Destination   |
|----------|--------|---------------|
| **Rewrite** | `/*`   | `/index.html` |

`render.yaml` on **`main`** does **not** ship with the **`render-static`** branch unless you sync Blueprint from the default branch.

The workflow also copies **`404.html`** from `index.html` as a fallback where the host uses a custom 404 page.

### Troubleshooting: `main-*.js` or `chunk-*.js` returns 404

Production filenames **change every build** (content hashing). A 404 on `main-XXXX.js` almost always means the **HTML and JS are out of sync**:

1. **Stale cache** — The browser (or a CDN) is still using an **old `index.html`** that references `main-ZHYDBTHU.js`, but the current deploy only has `main-<new-hash>.js`. **Fix:** hard refresh (Shift+Reload), clear site data for your Render URL, or try an incognito window.
2. **Wrong Render settings** — Static site must use branch **`render-static`** (the branch GitHub Actions publishes), publish directory **`.`** (repo root of that branch), and **empty** build command. If Render still builds from **`main`** or the wrong folder, files will be missing or mismatched.
3. **Deploy lag** — After pushing `main`, wait for the **Publish static site** workflow to finish and Render to redeploy from `render-static` before testing.

`index.html` uses `<base href="/">`, so scripts load from the site root; nested routes do not break JS paths when the SPA rewrite is correct.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
