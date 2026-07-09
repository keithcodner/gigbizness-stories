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

## Bricktoon Architecture

The repo now supports a bricktoon production layer on top of the existing research and render pipeline:

- `format -> research -> angle -> cast -> script -> scene cards -> voice -> visuals -> animation -> render -> qc`
- Format recipes live in `formats/`
- Style rules live in `styles/bricktoon/`
- Reusable role scaffolds live in `character_library/bricktoon/`

New workspace stages include `00_brief`, `02_angle`, `03_cast`, `05_scene_cards`, `07_visuals`, `08_animation`, and `09_edit_plan`.

Useful commands:

```bash
npm run format -- --topic fake_moving_companies
npm run angle -- --topic fake_moving_companies
npm run cast -- --topic fake_moving_companies
npm run scene-cards -- --topic fake_moving_companies
npm run animation -- --topic fake_moving_companies
```

## Music Standard

Use music from the local royalty-free library:

- Prefer `C:/Users/admin/Music/royalty free music/@all/good`
- Otherwise use sorted subfolders inside `C:/Users/admin/Music/royalty free music/@all`
- Do not use files sitting directly in the root of `@all`; that root is treated as unsorted

Each workspace now seeds `04_assets/music/music_selection.md` and `04_assets/music/music_manifest.csv`, and QC expects the selected track to be documented there.
