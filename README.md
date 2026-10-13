# SwopBlog

A browser-local blog demo built with vanilla HTML, CSS and JavaScript: publish/delete stories, reply, like, and customize a profile/avatar. Posts and replies belong to the current browser; they are not shared with other visitors. Seeded example authors are fictional demo data. The historical repository name does not describe the current implementation.

## One app, one build

The root `index.html`, `app.js`, and `style.css` are the canonical app. The unused React/CRA placeholder implementation and dependencies have been removed so local preview and GitHub Pages serve the same UI.

```sh
npm ci
npx playwright install chromium --only-shell
npm start
npm test
npm run build
```

Open http://127.0.0.1:8000. Python 3 serves the app; Node 24 LTS runs tests/build. `dist-site` contains only public app files and is the Pages deployment artifact. Playwright is free and development-only. No runtime package installation is required by the browser.

## Persistence and validation

The existing `swopblog_profile_v2` and `swopblog_posts_v2` keys are preserved. Corrupt or structurally invalid data falls back to the demo state. Storage failures warn and keep the tab usable; unsaved changes may be lost on reload. User text renders literally, including markup-looking content. Images/fonts/icons may request external resources; core CRUD still works when those requests fail.

The CI browser suite checks profile edits, stories, replies, likes, deletion, reload persistence, literal HTML, blocked/corrupt storage and 390px/768px/1440px layouts with external requests disabled. It also builds the same public app deployed on Pages.

A shared multi-user blog would require a backend, server-side authentication/authorization, moderation and migrations. This cleanup intentionally keeps the existing local demo honest rather than presenting localStorage as a production community service.
