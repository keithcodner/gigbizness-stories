# Business Video Docs

Phase 1 scaffolding for a business video production system.

## Phase 1

This milestone provides:

- Repository structure based on the implementation spec
- Starter config and topic files
- A topic-driven workspace generator

## Usage

Install dependencies:

```bash
npm install
```

Initialize a topic workspace:

```bash
npm run init:topic -- --topic tow_truck_dark_side
```

This creates `workspaces/tow_truck_dark_side/` with the expected folder tree and starter files.

## Music Standard

Use music from the local royalty-free library:

- Prefer `C:/Users/admin/Music/royalty free music/@all/good`
- Otherwise use sorted subfolders inside `C:/Users/admin/Music/royalty free music/@all`
- Do not use files sitting directly in the root of `@all`; that root is treated as unsorted

Each workspace now seeds `04_assets/music/music_selection.md` and `04_assets/music/music_manifest.csv`, and QC expects the selected track to be documented there.
