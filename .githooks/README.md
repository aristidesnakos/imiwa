# Tracked git hooks

Git only runs hooks from `.git/hooks`, which is not tracked and so cannot be
shared. These hooks live here instead and are opted into per clone:

```sh
git config core.hooksPath .githooks
```

Run that once after cloning. To check it is active:

```sh
git config --get core.hooksPath   # -> .githooks
```

Any single commit can bypass every hook with `git commit --no-verify`.

## `commit-msg`

Rejects a CI-skip marker (`[skip ci]` and its documented variants) appearing
**below the subject line**.

Why: a commit whose body described CI behaviour spelled the marker literally in
prose. Vercel scans the whole commit message, not just the subject, so it
skipped the build — no deployment record and no commit status, i.e. nothing
that looks like a failure. Four commits sat undeployed and the only visible
symptom was a 404 on a verification key file. GitHub Actions honours the same
markers, so the structured-data gate was silently skipped too.

What it deliberately allows:

- **The marker in the subject line.** That is the intentional usage.
  `.github/workflows/indexnow-submit.yml` and `indexation-alarm.yml` both commit
  state files back to `main` with the marker in the subject to avoid a redundant
  deploy; blocking those would break working automation.
- **Comment lines** (`#`), which git strips anyway — including the commented
  template.
- **The `git commit -v` diff region** below the scissors line. This matters
  here because the workflow files above literally contain the marker, so a
  naive scan would reject any commit that touches them.
