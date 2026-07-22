# Technical Change Log

This log tracks implementation changes, bug fixes, and incidental fixes discovered while working on the pipeline.

## 2026-07-22

### Changed

- Added `src/bricktoon/renderOutputProof.js` plus `scripts/build_render_output_proof.js` so the pipeline now has a post-render proof layer that inspects the encoded video itself instead of trusting manifest labels alone.
- Updated `agents/orchestrator.js` so `bricktoon-finish` now runs render-output proof after encode, refreshes reliability artifacts, and fails the finish when the rendered output is effectively a static slideshow, overly fallback-heavy, repetitive, or near-silent.
- Updated `src/bricktoon/reliabilityGate.js`, `scripts/build_bricktoon_reliability_report.js`, and `config/bricktoon_runtime_profiles.json` so reliability now tracks scene fallback spread, records render-output-proof state, and tightens GTX 1080 runtime thresholds around fallback distribution.
- Added regression coverage in `tests/bricktoon_pipeline.test.js` for the new scene-fallback-spread blocker and the new static low-audio render-output-proof blocker.
- Verified the new render-output proof against `workspaces/test_story_template/06_renders/draft_01.mp4` on Wednesday, July 22, 2026. The new proof correctly blocked the render for low audio bitrate, fallback overuse, repetitive sampled frames, and effectively static motion samples.
- Refreshed `workspaces/test_story_template/10_qc/bricktoon_reliability_report.{json,md}` on Wednesday, July 22, 2026 so the live topic no longer carries an outdated ready-to-finish impression after the new gating rules were added.
- Continued executable build work for `Milestone 2 -> Option 1 -> Phase 6: Overnight Reliability`.
- Executed the new scoped recovery path against the `heavy_rework` bucket for `S05`, refreshing keyframes, validation, preview, motion, stabilization, compositing, sequence assembly, render contract, promotion gate, reliability, review packet, and recovery plan in one governed pass.
- Updated the live recovery state for `workspaces/test_story_template` so `S05` now moves out of rework and into governed manual review, leaving no remaining rework scenes in the current benchmark topic.
- Continued executable build work for `Milestone 2 -> Option 1 -> Phase 6: Overnight Reliability`.
- Fixed `scripts/stabilize_ai_motion.js` so scene-scoped recovery no longer crashes during stabilization from a missing `readJsonSafe` import.
- Executed the new scoped recovery path against the `light_rework` bucket for `S03`, `S06`, and `S07`, refreshing keyframes, validation, preview, motion, stabilization, compositing, sequence assembly, render contract, promotion gate, reliability, review packet, and recovery plan in one governed pass.
- Updated the live recovery state for `workspaces/test_story_template` so `S03`, `S06`, and `S07` now move out of rework and into governed manual review, leaving `S05` as the only remaining true rework scene.
- Continued executable build work for `Milestone 2 -> Option 1 -> Phase 6: Overnight Reliability`.
- Added `src/bricktoon/sceneSelection.js` so scene-scoped reruns now have one reusable contract for scene-id parsing, scoped shot collection, and partial report merging.
- Updated `scripts/generate_shot_keyframes.js`, `scripts/validate_generated_assets.js`, `scripts/generate_ai_motion_passes.js`, `scripts/stabilize_ai_motion.js`, `scripts/composite_bricktoon_shots.js`, and `scripts/assemble_bricktoon_scene_sequences.js` so expensive reruns can now target selected scenes without wiping unrelated topic-wide report state.
- Updated `agents/asset_consistency_agent.js`, `agents/ai_video_motion_agent.js`, and `agents/shot_compositing_agent.js` so scoped scene reruns can flow through the existing agent wrappers instead of only through direct script calls.
- Added `scripts/run_bricktoon_scene_recovery.js` so the repo now has a governed scene-recovery execution layer that can rerun selected weak scenes, refresh preview/gate/reliability artifacts, and preserve non-targeted report data.
- Updated `agents/orchestrator.js` and `package.json` so `bricktoon-scene-recovery` / `npm run bricktoon:scene-recovery` are first-class recovery entrypoints, and `asset-generation`, `asset-consistency-validation`, `ai-video-motion-passes`, `shot-compositing`, and `scene-assembly` now accept `--scene-ids`.
- Updated `src/bricktoon/reliabilityRecoveryPlan.js` so light and heavy rework buckets now recommend the new scoped recovery stage instead of forcing operators to rerun each expensive stage manually.
- Continued executable build work for `Milestone 2 -> Option 1 -> Phase 6: Overnight Reliability`.
- Added `src/bricktoon/artifactFreshness.js` so the pipeline now has a reusable freshness contract for route-dependent downstream artifacts instead of treating file existence as enough proof of validity.
- Updated `agents/orchestrator.js` so stale hybrid-animation contracts, motion-pass reports, compositing reports, and scene-sequence reports now fail readiness and trigger rebuild behavior instead of silently preserving older fallback decisions.
- Updated `src/bricktoon/reliabilityGate.js` and `scripts/build_bricktoon_reliability_report.js` so the reliability report can now surface stale downstream artifacts explicitly, block on them, and stop confusing freshness problems with pure scene-quality failures.
- Fixed a stale-dependency gap where medium character-performance shots could keep older fallback selections in downstream reports even after the route heuristic and hybrid contract were corrected.
- Added `src/bricktoon/reliabilityRecoveryPlan.js` plus `scripts/build_bricktoon_recovery_plan.js` so blocked reliability runs now emit a ranked scene-recovery package instead of requiring manual comparison across reliability, promotion-gate, and sequence reports.
- Updated `agents/orchestrator.js` and `package.json` so `bricktoon-recovery-plan` / `npm run bricktoon:recovery` are first-class recovery entrypoints, and `bricktoon-reliability` now auto-generates the recovery plan on each run.
- Added `src/bricktoon/sceneReviewClearance.js` plus `scripts/build_bricktoon_scene_review.js` so review-required scenes now emit a governed review packet and decision file instead of living only as promotion-gate warnings.
- Updated `agents/orchestrator.js`, `package.json`, and `src/bricktoon/reliabilityGate.js` so `bricktoon-scene-review` / `npm run bricktoon:scene-review` are first-class entrypoints and approved review scenes can stop counting as unresolved reliability blockers.
- Updated `src/bricktoon/reliabilityGate.js` so reliability can now evaluate a benchmark-selected scope and normalize imported professional benchmark scenes instead of trusting stale pre-reintegration scene-sequence fallback metrics.
- Added `src/bricktoon/benchmarkSceneProof.js` plus `scripts/build_benchmark_scene_proof.js` so the promoted benchmark scene can now be packaged into a filtered proof manifest, benchmark proof plan, and benchmark proof report.
- Updated `agents/render_agent.js` so custom manifest/output paths can be rendered without disturbing the default whole-topic draft/final outputs.
- Updated `agents/orchestrator.js`, `config/bricktoon_runtime_profiles.json`, and `package.json` so `benchmark-scene-proof` / `npm run bricktoon:benchmark-proof` are first-class GTX 1080 benchmark-proof entrypoints.
- Updated `scripts/build_bricktoon_reliability_report.js` so reliability can emit a separate `bricktoon_benchmark_reliability_report.{json,md}` for benchmark-scoped proof runs.
- Updated `src/bricktoon/reliabilityGate.js` so the reliability layer now also provides normalized overnight-state summaries plus a durable overnight run report contract.
- Updated `agents/bricktoon_overnight_agent.js` so overnight runs now persist step history, current-step tracking, blocked/failure context, last reliability decision, run counts, resume counts, and `bricktoon_overnight_report.{json,md}` artifacts.
- Updated `src/bricktoon/hybridProductionReadiness.js` so production-readiness decisions now interpret blocked, failed, and completed overnight states through the stronger overnight-trial contract.
- Updated `src/bricktoon/professionalSemiAutomationDecision.js` so the professional-route decision now uses the actual overnight-proof vocabulary (`passed` / `partial` / `not_recorded`) instead of stale status naming.
- Updated `agents/orchestrator.js` so workspace path helpers now expose `bricktoon_overnight_report.{json,md}` as first-class QC artifacts.
- Updated `docs/technical_docs/BRICKTOON_PREMIUM_QUALITY_MILESTONE_2_PLAN.md`, `docs/technical_docs/PIPELINE_STATE_VISUAL.md`, and `docs/technical_docs/OPTION1_PHASE6_IMPLEMENTATION_REPORT.md` so the active reliability-hardening work, current benchmark blocker reality, and remaining Phase 6 pressure are documented explicitly.
- Started executable build work for `Milestone 2 -> Option 3 -> Phase 5: Semi-Automation Decision`.
- Added `src/bricktoon/professionalSemiAutomationDecision.js` so the project now has a reusable route-classification layer for standardize-now decisions, operator-assisted boundaries, and not-ready-for-scale decisions.
- Added `scripts/build_professional_semi_automation_decision.js` so each workspace can emit a versioned semi-automation decision package under `11_external_handoff/professional_semi_automation/decision_*`.
- Updated `agents/orchestrator.js`, workspace generation, and `package.json` so `professional-semi-automation` / `npm run professional:decision` are first-class pipeline entrypoints.
- Updated the milestone plan and pipeline state board so Option 3 Phase 5 is now tracked as an implemented build phase and Option 3 now has an explicit route classification instead of remaining build-active by implication.
- Started executable build work for `Milestone 2 -> Option 3 -> Phase 4: Repo Reintegration`.
- Added `src/bricktoon/professionalReintegration.js` so the project now has a reusable professional reintegration layer for imported benchmark assets, render-contract alignment checks, QC compatibility, and benchmark comparison decisions.
- Added `scripts/build_professional_reintegration.js` so each workspace can emit a versioned reintegration package under `11_external_handoff/professional_reintegration/reintegration_*`.
- Updated `src/render/resolveSceneAsset.js` so imported `professional_hero_scene_sequence` assets outrank older composited scene-sequence assets during render-contract selection.
- Updated `agents/orchestrator.js`, workspace generation, and `package.json` so `professional-reintegration` / `npm run professional:reintegrate` are first-class pipeline entrypoints.
- Updated the milestone plan and pipeline state board so Option 3 Phase 4 is now tracked as an implemented build phase and the professional reintegration layer is visible in the shared system view.
- Started executable build work for `Milestone 2 -> Option 3 -> Phase 3: Hero Scene Build`.
- Added `src/bricktoon/professionalHeroScene.js` so the project now has a reusable professional hero-scene layer for benchmark-scene coverage checks, shot-build acceptance checks, and governed hero-scene build decisions.
- Added `scripts/build_professional_hero_scene.js` so each workspace can emit a versioned benchmark hero-scene package under `11_external_handoff/professional_hero_scene/build_*`.
- Updated `agents/orchestrator.js`, workspace generation, and `package.json` so `professional-hero-scene` / `npm run professional:hero-scene` are first-class pipeline entrypoints.
- Updated the milestone plan and pipeline state board so Option 3 Phase 3 is now tracked as an implemented build phase and the professional hero-scene layer is visible in the shared system view.
- Started executable build work for `Milestone 2 -> Option 3 -> Phase 2: Professional Toolchain Mapping`.
- Added `config/professional_toolchain_profiles.json` so the repo now has governed professional-toolchain profiles for Adobe Character Animator, Toon Boom Harmony, and Adobe Animate handoff paths.
- Added `src/bricktoon/professionalToolchainMap.js` so the project now has a reusable professional toolchain-map layer for capability mappings, shot-class playbooks, and repeatable downstream operating models.
- Added `scripts/build_professional_toolchain_map.js` so each workspace can emit a versioned downstream operating-model package under `11_external_handoff/professional_toolchain_map/map_*`.
- Updated `agents/orchestrator.js`, workspace generation, and `package.json` so `professional-toolchain-map` / `npm run professional:map` are first-class pipeline entrypoints.
- Updated the milestone plan and pipeline state board so Option 3 Phase 2 is now tracked as an implemented build phase and the professional toolchain-map layer is visible in the shared system view.
- Started executable build work for `Milestone 2 -> Option 3 -> Phase 1: Preproduction Export Lock`.
- Added `src/bricktoon/professionalExportLock.js` so the project now has a reusable export-lock layer for cast exports, shot-plan exports, composition exports, reference/audio packaging, benchmark guidance, and handoff readiness decisions.
- Added `scripts/build_professional_export_lock.js` so each workspace can emit a versioned external-handoff package under `11_external_handoff/professional_export_lock/export_*`.
- Updated `agents/orchestrator.js`, workspace layout generation, and `package.json` so `professional-export-lock` / `npm run professional:export-lock` are first-class pipeline entrypoints.
- Updated the milestone plan and pipeline state board so Option 3 Phase 1 is now tracked as an implemented build phase and the professional export-lock layer is visible in the shared system view.
- Started executable build work for `Milestone 2 -> Option 2 -> Phase 6: Benchmark Demo And Production Readiness Decision`.
- Added `src/bricktoon/hybridProductionReadiness.js` so the hybrid path now has a reusable production-readiness layer for benchmark fixture locking, asset-catalog sufficiency review, overnight-trial summary, and default-path decisions.
- Added `scripts/build_hybrid_production_readiness_report.js` so each workspace can emit `hybrid_production_readiness_report.{json,md}` instead of leaving the default-use decision scattered across multiple reports.
- Updated `agents/orchestrator.js` and `package.json` so `hybrid-production-readiness` / `npm run hybrid:readiness` are first-class pipeline entrypoints.
- Added `docs/technical_docs/OPTION2_PHASE6_IMPLEMENTATION_REPORT.md` so Option 2 Phase 6 now closes with a governed implementation report and explicit final assessment.
- Updated the milestone plan and pipeline state board so Option 2 Phase 6 is now tracked as the active build phase and the production-readiness layer is visible in the shared system view.
- Started executable build work for `Milestone 2 -> Option 2 -> Phase 5: Preview Gate And Promotion Rules`.
- Added `src/bricktoon/hybridPromotionGate.js` so the hybrid path now has a reusable promotion-gate layer for still-benchmark readiness, benchmark-scene overrides, scene-level promotion decisions, runtime-tier recommendations, and human checkpoint language.
- Added `scripts/build_hybrid_promotion_gate.js` so each workspace can emit `hybrid_promotion_gate_report.{json,md}` before expensive premium finishing begins.
- Updated `src/bricktoon/reliabilityGate.js` and `scripts/build_bricktoon_reliability_report.js` so reliability now recognizes promotion-gate approval state, benchmark-scene readiness, and promoted-scene counts instead of treating preview approval as a binary full-topic pass/fail.
- Updated `config/bricktoon_runtime_profiles.json` so `gtx1080_premium_preview`, `gtx1080_overnight_finish_draft`, and `gtx1080_overnight_finish_1080p` now explicitly require promotion-gate approval, while `gtx1080_preview` remains the lighter early-review tier.
- Updated `agents/orchestrator.js` and `package.json` so `hybrid-promotion-gate` / `npm run hybrid:gate` are first-class pipeline entrypoints and `bricktoon-auto` now routes through preview, promotion gate, and reliability in sequence.
- Updated the milestone plan and pipeline state board so Option 2 Phase 5 is now tracked as the active build phase and the promotion-gate layer is visible in the shared system view.

### Verified

- Verified the heavy-rework recovery path on Wednesday, July 22, 2026: `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-scene-recovery --bucket heavy_rework --runtime-profile gtx1080_premium_preview` completed successfully.
- Verified the refreshed live gate state on Wednesday, July 22, 2026: `workspaces/test_story_template/10_qc/bricktoon_reliability_report.json` now records `hold_scenes: 0`, `review_scenes: 6`, `fragile_scene_ratio: 0`, `fallback_ratio: 0.308`, and gate decision `review_required`.
- Verified the refreshed recovery queue on Wednesday, July 22, 2026: `workspaces/test_story_template/10_qc/bricktoon_recovery_plan.json` now classifies `S01`, `S02`, `S03`, `S05`, `S06`, and `S07` as `manual_review`, with no remaining rework bucket entries.
- Verified the repaired scoped-recovery path on Wednesday, July 22, 2026: `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-scene-recovery --bucket light_rework --runtime-profile gtx1080_premium_preview` completed successfully after the stabilization-script fix.
- Verified the refreshed live gate state on Wednesday, July 22, 2026: `workspaces/test_story_template/10_qc/bricktoon_reliability_report.json` now records `hold_scenes: 1`, `review_scenes: 5`, `fragile_scene_ratio: 0.143`, and `fallback_ratio: 0.346`.
- Verified the refreshed recovery queue on Wednesday, July 22, 2026: `workspaces/test_story_template/10_qc/bricktoon_recovery_plan.json` now classifies `S01`, `S02`, `S03`, `S06`, and `S07` as `manual_review`, `S05` as `heavy_rework`, and `S04` as `benchmark_locked`.
- Verified the new scene-selection / scoped-merge regression coverage on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 70 tests, including the new scoped-recovery helper coverage.
- Verified the new manual-review recovery entrypoint on Wednesday, July 22, 2026: `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-scene-recovery --bucket manual_review --runtime-profile gtx1080_premium_preview` completed successfully and refreshed review, reliability, and recovery artifacts without a whole-topic rerun.
- Verified the new artifact-freshness regression coverage on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 68 tests, including the new stale-artifact reliability checks.
- Verified the refreshed medium-shot routing on Wednesday, July 22, 2026: `node agents\\orchestrator.js --topic test_story_template --stage hybrid-animation-contract` completed successfully and refreshed `workspaces/test_story_template/08_animation/hybrid_contract/hybrid_animation_contract.json` so `S03_SHOT_002`, `S04_SHOT_002`, `S05_SHOT_002`, `S06_SHOT_002`, and `S07_SHOT_002` now resolve as `hybrid_2d_ai`.
- Verified the refreshed medium-shot compositing on Wednesday, July 22, 2026: `node scripts\\composite_bricktoon_shots.js --workspace workspaces\\test_story_template` completed successfully and `workspaces/test_story_template/08_animation/compositing_reports/compositing_report.json` now selects `stabilized_motion_pass` for the five medium bridge shots instead of procedural fallback.
- Verified the refreshed reliability state on Wednesday, July 22, 2026: `node scripts\\build_bricktoon_reliability_report.js --workspace workspaces\\test_story_template --runtime-profile gtx1080_premium_preview` now blocks only for scene quality and review reasons, not for stale downstream artifacts.
- Verified the new reliability-recovery regression coverage on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 61 tests.
- Verified the new scene-review and approved-review regression coverage on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 64 tests.
- Verified live review-packet generation on Wednesday, July 22, 2026: `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-scene-review` now writes `workspaces/test_story_template/10_qc/bricktoon_scene_review_packet.{json,md}` plus `bricktoon_scene_review_decisions.json`.
- Verified live recovery-plan generation on Wednesday, July 22, 2026: `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-reliability --runtime-profile gtx1080_premium_preview` now writes `workspaces/test_story_template/10_qc/bricktoon_recovery_plan.{json,md}` automatically.
- Verified the refreshed full-topic reliability numbers on Wednesday, July 22, 2026: `workspaces/test_story_template/10_qc/bricktoon_reliability_report.json` now records 4 hold scenes, 4 fragile scenes, 2 review scenes, fallback ratio `0.462`, and fragile-scene ratio `0.571`.
- Verified the live recovery queue on Wednesday, July 22, 2026: `workspaces/test_story_template/10_qc/bricktoon_recovery_plan.json` now ranks `S01`, `S02`, `S03`, `S06`, `S07`, `S05`, with `S04` isolated as `benchmark_locked`.
- Verified the new benchmark-scene proof path on Wednesday, July 22, 2026: `npm run bricktoon:benchmark-proof -- --topic test_story_template` completed successfully and rendered `workspaces/test_story_template/06_renders/benchmark_scene_proof.mp4`.
- Verified benchmark-scoped proof gating on Wednesday, July 22, 2026: `workspaces/test_story_template/10_qc/bricktoon_benchmark_reliability_report.md` now records `ready_for_overnight_finish` for scoped scene `S04` with `fallback_ratio: 0` and `fragile_scene_ratio: 0`.
- Verified benchmark-proof packaging on Wednesday, July 22, 2026: `workspaces/test_story_template/10_qc/benchmark_scene_proof_report.md` now records promoted benchmark scene `S04` with expected duration `28` seconds and output file `06_renders/benchmark_scene_proof.mp4`.
- Verified the expanded reliability/benchmark-proof regression coverage on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 58 tests.
- Verified the continued Option 1 Phase 6 reliability-hardening work on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 56 tests, including the new overnight-state summary, overnight-report, and overnight-proof-classification coverage.
- Verified `node agents\\orchestrator.js --topic test_story_template --stage hybrid-production-readiness --runtime-profile gtx1080_premium_preview` on Wednesday, July 22, 2026; the governed readiness verdict remains `keep_option2_in_benchmark_mode` after the overnight-contract hardening.
- Verified `node agents\\orchestrator.js --topic test_story_template --stage professional-semi-automation --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview` on Wednesday, July 22, 2026; the governed route classification remains `benchmark_route_only` after the overnight-status naming alignment.
- Verified Option 3 Phase 5 code-level behavior on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 53 tests, including the new professional semi-automation decision coverage.
- Verified real Option 3 Phase 5 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage professional-semi-automation --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview`.
- Current Option 3 Phase 5 evidence now includes `workspaces/test_story_template/11_external_handoff/professional_semi_automation/decision_001/` plus `latest_professional_semi_automation_report.{json,md}`, with decision `semi_automation_decision_locked`.
- The current live Option 3 route classification is now explicit: `benchmark_route_only`, with recommended use `use_as_benchmark_route_only`.
- Verified Option 3 Phase 4 code-level behavior on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 50 tests, including the new professional reintegration coverage.
- Verified real Option 3 Phase 4 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage professional-reintegration --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview`.
- Current Option 3 Phase 4 evidence now includes `workspaces/test_story_template/11_external_handoff/professional_reintegration/reintegration_002/` plus `latest_professional_reintegration_report.{json,md}`, with decision `professional_reintegration_locked`.
- Verified that `workspaces/test_story_template/09_edit_plan/render_contract.json` now selects `professional_hero_scene_sequence` for scene `S04`, using imported asset `PROHEROSEQ_S04_MAIN` at `08_animation/professional_imports/S04_professional_hero_sequence.mp4`.
- Verified Option 3 Phase 3 code-level behavior on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 46 tests, including the new professional hero-scene coverage.
- Verified real Option 3 Phase 3 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage professional-hero-scene --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview`.
- Current Option 3 Phase 3 evidence now includes `workspaces/test_story_template/11_external_handoff/professional_hero_scene/build_001/` plus `latest_professional_hero_scene_report.{json,md}`, with decision `hero_scene_build_locked`.
- The current live hero-scene package now records 5 benchmark-scene shot contracts, 5 editorial proof shots, 5 premium-motion shots, 3 talking shots, 5 prop-interaction shots, and a benchmark acceptance checklist for speech, props, inserts, pacing, and animation readability.
- Verified Option 3 Phase 2 code-level behavior on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 43 tests, including the new professional toolchain-map coverage.
- Verified real Option 3 Phase 2 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage professional-toolchain-map --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview`.
- Current Option 3 Phase 2 evidence now includes `workspaces/test_story_template/11_external_handoff/professional_toolchain_map/map_002/` plus `latest_toolchain_map_report.{json,md}`, with decision `toolchain_map_locked`.
- The current live professional toolchain map now records 26 shot contracts, 4 character contracts, 16 mouth-ready speaking shots, full camera/compositing coverage, and a six-step operating model centered on `Adobe Character Animator + After Effects`.
- Verified Option 3 Phase 1 code-level behavior on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 40 tests, including the new professional export-lock coverage.
- Verified real Option 3 Phase 1 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage professional-export-lock --runtime-profile gtx1080_premium_preview`.
- Current Option 3 Phase 1 evidence now includes `workspaces/test_story_template/11_external_handoff/professional_export_lock/export_001/` plus `latest_export_lock_report.{json,md}`, with decision `export_locked` and 252 exported artifacts.
- Verified Option 2 Phase 6 code-level behavior on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 37 tests, including the new production-readiness coverage.
- Verified real Option 2 Phase 6 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage hybrid-production-readiness --runtime-profile gtx1080_premium_preview`.
- Current Option 2 Phase 6 evidence now includes `10_qc/hybrid_production_readiness_report.{json,md}` marking the benchmark fixture as locked, but the current governed verdict as `keep_option2_in_benchmark_mode` with default recommendation `hold_option2_as_benchmark_only`.
- Verified Option 2 Phase 5 code-level behavior on Wednesday, July 22, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 33 tests, including the new promotion-gate coverage.
- Verified real Option 2 Phase 5 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage hybrid-promotion-gate --runtime-profile gtx1080_premium_preview`.
- Current Option 2 Phase 5 evidence now includes `10_qc/hybrid_promotion_gate_report.{json,md}` marking scene `S04` as the benchmark-approved promotion candidate with topic decision `approved_for_selected_scene_promotion`.
- Verified the updated reliability integration on Wednesday, July 22, 2026: `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-reliability --runtime-profile gtx1080_premium_preview` now reports that promotion-gate readiness is present while the full topic remains blocked for concrete fallback/fragility/review reasons.

## 2026-07-21

### Changed

- Started executable build work for `Milestone 2 -> Option 2 -> Phase 4: Shot Language And Editorial Quality`.
- Added `src/bricktoon/hybridEditorialProof.js` so the hybrid path now has a reusable editorial-sequence layer for benchmark-scene selection, editorial-role assignment, and sequence-readiness summaries.
- Added `scripts/render_hybrid_editorial_sequence.js` so the repo can consume the hybrid contract into a full benchmark-scene editorial sample with per-shot outputs, posters, reports, and a combined sequence file under `08_animation/hybrid_editorial/`.
- Updated `agents/orchestrator.js` and `package.json` so `hybrid-editorial-proof` / `npm run hybrid:editorial` are first-class pipeline entrypoints.
- Updated the milestone plan and pipeline state board so Option 2 Phase 4 is now tracked as the active implementation phase and the editorial benchmark stage is visible as a real pipeline layer.
- Started executable build work for `Milestone 2 -> Option 2 -> Phase 3: Minimum Viable Character Performance`.
- Added `src/bricktoon/hybridPerformanceProof.js` so the hybrid path now has a reusable proof-profile layer for selecting representative benchmark shots and boosting them into a controlled speaking-performance sample.
- Added `scripts/render_hybrid_performance_proof.js` so the repo can consume the Phase 2 hybrid contract into real proof clips, proof posters, a combined proof sequence, and proof reports under `08_animation/hybrid_shots/`.
- Updated `agents/orchestrator.js` and `package.json` so `hybrid-performance-proof` / `npm run hybrid:proof` are first-class pipeline entrypoints.
- Updated the milestone plan and pipeline state board so Option 2 Phase 3 is now tracked as the active implementation phase and the new proof stage is visible as a real pipeline layer.
- Started executable build work for `Milestone 2 -> Option 2 -> Phase 2: Hybrid Animation Contract`.
- Added `src/bricktoon/hybridAnimationContract.js` as the reusable character-package and shot-package handoff layer for the hybrid animation path.
- Added `scripts/build_hybrid_animation_contract.js` so the repo now emits concrete hybrid handoff packages at `08_animation/hybrid_contract/` instead of relying on loose still/layer/rig/timing files.
- Updated the hybrid character contract so it now preserves `cast_member_id` alongside `character_id`, allowing shot plans keyed to `CAST_*` ids to bind back to the correct rig and identity package during handoff.
- Updated `agents/orchestrator.js` and `package.json` so `hybrid-animation-contract` / `npm run hybrid:contract` are first-class pipeline entrypoints.
- Updated the milestone plan and pipeline state board so Option 2 Phase 2 is now tracked as the active implementation phase and the new handoff package is visible as a real pipeline layer rather than planning-only intent.
- Started executable build work for `Milestone 2 -> Option 2 -> Phase 1: Repo-Side Still And Identity Lock`.
- Added `option2_phase1_repo_side_still_identity_lock` to `config/visual_generation.json` so the hybrid still-lock path now has a pinned GTX 1080 benchmark profile, explicit approval focus, shot-class workflow expectations, and benchmark-pack requirements.
- Added managed shot-class workflow routing plus new hybrid still templates for closeups, dialogue/two-shots, establishing frames, and document inserts so repo-side still generation can prepare cleaner hybrid-motion handoff stills instead of only using generic quality-tier routing.
- Updated `scripts/generate_character_bibles.js` so `visual_character_bible.json` now emits hybrid handoff rules, dual benchmark-profile coverage, and per-character still-acceptance contracts alongside the earlier cutout-animation contracts.
- Updated `scripts/generate_bricktoon_character_refs.js` so character refs now write `hybrid_identity_package.json` beside the variant manifest, turning still identity lock into a reusable handoff package instead of only loose image files.
- Updated `scripts/generate_shot_keyframes.js` so shot approvals now preserve shot class, hybrid handoff contract data, and Option 2 benchmark-profile linkage for future motion-tool handoff and review.
- Added `scripts/build_hybrid_still_benchmark_pack.js` plus the `hybrid-still-benchmark` orchestrator/package stage so the repo can now build a review pack with shot-class pass/fail guidance and linked example stills.
- Updated the milestone and pipeline-state docs so Option 2 Phase 1 is now tracked as the active build phase while Option 1 Phase 6 remains started but not closed.
- Started executable build work for `Milestone 2 -> Option 1 -> Phase 6: Overnight Reliability`.
- Added `config/bricktoon_runtime_profiles.json` so preview, premium-preview, and overnight-finish behavior is now pinned to explicit GTX 1080-safe runtime tiers with defined gate expectations.
- Added `src/bricktoon/reliabilityGate.js` so preview existence, sequence health, render-contract readiness, QC approval state, fallback pressure, fragile-scene pressure, and unresolved-high-priority assets are now judged through one reusable reliability contract.
- Added `scripts/build_bricktoon_reliability_report.js` so each topic can emit durable reliability JSON/markdown before expensive finish runs.
- Added `agents/bricktoon_overnight_agent.js` so the bricktoon pipeline now has a resumable overnight runner with state tracking and a reliability stop before finish.
- Updated `agents/orchestrator.js` so `bricktoon-reliability` and `bricktoon-overnight` are first-class stages, runtime profiles can be enforced during `bricktoon-finish`, and `bricktoon-auto` can route through the new reliability checkpoint.
- Updated `package.json` with `bricktoon:reliability` and `bricktoon:overnight` scripts so the new Phase 6 runtime path is callable without manual command assembly.
- Updated the milestone and pipeline-state docs so Option 1 Phase 6 is now tracked as the active implementation phase and the reliability gate is visible in the shared system view.
- Added a formal Phase 6 closeout-report requirement and reserved `docs/technical_docs/OPTION1_PHASE6_IMPLEMENTATION_REPORT.md` as the report path that must be completed before Phase 6 is treated as fully closed.
- Started executable build work for `Milestone 2 -> Option 1 -> Phase 5: Compositing And Sequence Polish`.
- Added `src/bricktoon/sequencePolish.js` so sequence-level caption chunking, subtitle-safe region planning, continuity summaries, pacing labels, and promotion-state decisions are now emitted from one reusable contract layer.
- Updated `scripts/composite_bricktoon_shots.js` so compositing reports now include shot type, sequence role, camera-angle profile, focus target, performance class, and subtitle-safe mode instead of only file-copy results.
- Updated `scripts/assemble_bricktoon_scene_sequences.js` so scene sequence reports now describe continuity strength, premium-motion coverage, fallback pressure, editorial pacing, subtitle-safe layout, audio-mix strategy, and promotion status per scene.
- Updated `src/render/compileRenderContract.js` and `scripts/compile_render_contract.js` so render contracts now consume shot-plan plus scene-sequence context, split longer narration into timed caption chunks, and preserve continuity/promotion metadata for downstream finishing.
- Updated the milestone and pipeline-state docs so Option 1 Phase 5 is now tracked as the active implementation phase and marked in progress instead of leaving Phase 4 as the current execution focus.
- Started executable build work for `Milestone 2 -> Option 1 -> Phase 4: Prop And Camera Performance`.
- Added `src/bricktoon/shotPerformanceContracts.js` so the pipeline now has reusable contracts for performance-class inference, visible-character limits, mouth modes, gesture profiles, prop tracks, timing windows, and camera recipes instead of scattering those decisions across renderer logic.
- Updated `agents/animation_agent.js` so `shot_performances.json` now emits richer directing metadata including `camera_recipe`, `timing_windows`, `screen_position`, `prop_ids`, and `prop_track` for each rendered shot performance.
- Updated `src/bricktoon/proceduralSequenceRenderer.js` so procedural clips now use explicit camera-angle profiles, easing, overshoot, top-down inserts, dialogue two-shots, document push-ins, and prop-attached beat timing instead of mostly generic framing and drift.
- Updated `scripts/generate_bricktoon_shot_clips.js` so shot-clip manifests and reports now record the chosen camera recipe and focus target for audit, debugging, and rerun review.
- Updated the milestone and pipeline-state docs so Option 1 Phase 4 is now tracked as the active build phase with benchmark signoff still pending.
- Started executable build work for `Milestone 2 -> Option 1 -> Phase 3: Speaking And Reaction Motion`.
- Updated `src/bricktoon/proceduralSequenceRenderer.js` so procedural shot clips now consume shot-performance contracts for mouth cycles, blink timing, head turns, body lean, reaction states, prop reveals, and camera push/drift behavior instead of mostly generic drift-only motion.
- Updated `scripts/generate_bricktoon_shot_clips.js` so clip rendering now uses `shot.cast_member_ids` as the character source of truth, records richer shot-performance metadata, and writes the newer `bricktoon_shot_clip_v2` workflow label.
- Updated `agents/orchestrator.js` so empty animation placeholder files no longer count as ready; downstream shot-motion stages now require a real animation plan plus populated shot-performance data.
- Updated the milestone and pipeline-state docs so Option 1 Phase 3 is now tracked as the active build phase with benchmark signoff still pending.
- Started executable build work for `Milestone 2 -> Option 1 -> Phase 2: Layer And Rig Foundation` on top of the earlier Phase 1 still-lock work.
- Updated `scripts/extract_shot_layers.js` so layer extraction now derives real shot-layer assets from approved keyframes using composition-guide regions instead of writing placeholder-only layer PNGs.
- Added `src/bricktoon/layerRegions.js` so motion-ready layer regions are calculated deterministically from shot/composition-guide data and can be regression-tested.
- Updated `scripts/build_character_rigs.js` so rig outputs now live in per-character rig folders, reference real character-ref state assets, expose sockets, and declare extraction expectations for the new layer package.
- Updated the milestone status docs so Option 1 Phase 2 is now the active build phase, while Phase 1 build work is tracked as done with visual signoff still pending.
- Started executable build work for `Milestone 2 -> Option 1 -> Phase 1: Animation-Ready Art Lock` instead of only extending planning docs.
- Updated shot-keyframe generation so benchmark still requests now include animation-safe framing guidance for mouth visibility, readable gesture arms, prop readability, and puppet-prep-safe cropping.
- Updated character-bible generation so it now emits animation-ready expression states, gesture states, prop states, rig targets, and benchmark review checklist data instead of only high-level continuity locks.
- Updated character-reference generation so it now produces a richer animation-ready variant contract including `emphatic`, `blink_closed`, `gesture_point`, and `hold_prop` reference variants plus a per-character variant manifest.
- Updated the milestone and pipeline state docs so Option 1 is now the active build path and Phase 1 is explicitly marked in progress rather than only planned.
- Updated the Milestone 2 planning set to explicitly record that all currently known quality, operational, and production blockers discussed so far are now captured in the implementation planning documents, while keeping the milestone itself unfinished.
- Updated `docs/technical_docs/BRICKTOON_PREMIUM_QUALITY_MILESTONE_2_PLAN.md` so the audit-identified gaps are now explicit milestone requirements, including real layer extraction, real puppet rigs, true speech mouth animation, believable gesture/reaction acting, dependable prop attachment, stronger animation QC, and overnight premium reliability.
- Updated the phase tracks inside the Milestone 2 plan so those missing capabilities are now attached to concrete option phases and shared milestone gates instead of only living in audit notes.
- Updated `docs/technical_docs/PIPELINE_STATE_VISUAL.md` so the active milestone gate now shows the audit-confirmed missing animation pieces that still block Jay Hona-level output.
- Updated the Milestone 2 plan again so the remaining non-animation blockers are also explicit, including benchmark-pack lock, reusable asset-catalog depth, full-sequence continuity proof, preview-to-finish trust, editorial audio/pacing fit, premium cost/runtime control, and the final production-readiness decision.
- Updated the pipeline state board so those broader milestone blockers are now visible alongside the animation-core blockers instead of remaining only in conversation notes.
- Updated the Milestone 2 plan again so the remaining secondary operational gaps are explicitly phased too, including workflow/model pinning, benchmark-fixture governance, fallback discipline, manual-review burden, versioned evidence, portability proof, asset-library governance, throughput expectations, and GTX 1080 feasibility for the accepted path.
- Updated the milestone governance rules so each option phase is now expected to complete with visible evidence and acceptable GTX 1080 behavior, even if the run is slow.

### Fixed

- Fixed a sequence-proof gap where Option 2 could prove isolated acting clips but still had no executable path for a full editorial benchmark scene.
- Fixed a selection gap where the editorial sample could have been picked ad hoc; the new stage now scores and selects the strongest mixed-coverage benchmark scene.
- Fixed a camera-language gap where editorial insert and establishing shots could inherit generic framing labels; the new editorial layer now forces shot-language-specific camera profiles for wide, closeup, push-in, and top-down beats.
- Fixed a proof-stage gap where Option 2 Phase 3 had no executable sample path, leaving the milestone dependent on abstract contract files instead of a visible acting proof sequence.
- Fixed a review gap where speaking-proof shot selection could have been ad hoc; the new proof layer now selects a predictable closeup, speaking single, dialogue/two-shot, and insert sample set.
- Fixed a reporting-honesty gap where insert/document proof beats could inherit speaking-oriented visibility and mouth-mode expectations; the proof builder now keeps insert beats document-focused.
- Fixed a hybrid-binding gap where the new external-motion handoff layer could preserve `character_id` but not the current `cast_member_id`, making shot-level rig binding ambiguous for `CAST_*` keyed plans.
- Fixed a workflow gap where Option 2 Phase 2 existed only in milestone planning and helper code, but not as a callable orchestrator stage that could generate a manifest-tracked contract package.
- Fixed a visibility gap where older production-route heuristics could still label medium-single or medium-two-shot character-performance shots as `procedural_document`; the new contract package now flags those mismatches explicitly instead of hiding them as silent assumptions.
- Fixed a still-handoff gap where the hybrid path had no repo-owned benchmark pack, leaving approval dependent on ad hoc screenshot review instead of a generated pass/fail evidence set.
- Fixed a contract gap where character refs could exist as image files without an explicit hybrid identity package for later motion-tool handoff.
- Fixed a workflow-selection gap where repo-side shot-keyframe generation could not pick different managed workflows by shot class, even though the hybrid path depends on different still expectations for closeups, dialogue, establishing shots, and document inserts.
- Fixed a visual-bible slot-path bug where talking, blink, gesture-point, and hold-prop reference slots were written without the `expressions/` folder segment, which could break later hybrid handoff consumers.
- Fixed a runtime-readiness gap where premium finish decisions could be made from scattered files and intuition instead of a single repeatable report.
- Fixed a stale orchestrator contract bug where render-contract readiness still looked for an older field shape and could misjudge current render-contract outputs.
- Fixed a stage-routing bug where `--resume` could be swallowed by the older generic overnight path even when the caller explicitly requested the new bricktoon overnight stage.
- Fixed a sequence-planning gap where composited shots could be assembled and rendered without preserving enough metadata to judge continuity, subtitle safety, or whether a scene should advance to a premium finish.
- Fixed a contract gap where render contracts only carried scene-level captions as a single block and did not expose per-scene continuity, pacing, or promotion state for downstream use.
- Fixed a reporting gap where scene-sequence quality could not be summarized generically across shots, making it harder to compare benchmark scenes or decide which ones still need animation polish.
- Fixed a Phase 4 directing gap where camera language and prop behavior were implied loosely by shot type instead of emitted as explicit reusable contracts that downstream renderers can follow consistently.
- Fixed a shot-performance gap where top-down inserts, closeup focus, dialogue exchanges, and document-emphasis timing could collapse back toward generic motion because the render stage lacked durable camera/timing metadata.
- Fixed a reporting gap where clip outputs could look different after a renderer change without the per-shot report preserving which camera recipe and focus target actually won.

### Notes

- Verified Option 2 Phase 4 code-level behavior on Tuesday, July 21, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 29 tests, including the new hybrid editorial scene-selection and sequence-readiness coverage.
- Verified real Option 2 Phase 4 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage hybrid-editorial-proof`.
- Current Option 2 Phase 4 evidence now includes 5 editorial benchmark shot clips, per-shot editorial posters, `08_animation/hybrid_editorial/S04_hybrid_editorial_sequence.mp4`, and `hybrid_editorial_sequence_report.{json,md}` marking scene `S04` as `editorial_benchmark_ready` with `continuity_status: locked` and `promotion_status: ready_for_finish`.
- Verified Option 2 Phase 3 code-level behavior on Tuesday, July 21, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 26 tests, including the new hybrid proof-selection and proof-performance coverage.
- Verified real Option 2 Phase 3 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage hybrid-performance-proof`.
- Current Option 2 Phase 3 evidence now includes 4 controlled proof shots, per-shot proof posters, per-shot proof clips, and `08_animation/hybrid_shots/hybrid_performance_proof_sequence.mp4`, with route-mismatch warnings preserved where older production-route heuristics still under-classify character-performance shots.
- Verified Option 2 Phase 2 code-level behavior on Tuesday, July 21, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 24 tests, including the new hybrid-contract binding and fallback-discipline coverage.
- Verified real Option 2 Phase 2 artifact generation on `workspaces/test_story_template` by running `node agents\\orchestrator.js --topic test_story_template --stage hybrid-animation-contract`.
- Current Option 2 Phase 2 evidence now includes 4 character handoff packages, 26 shot handoff packages, 9 hybrid-character shots that explicitly block if layers/rigs/timing are missing, and route-mismatch warnings where older production routes still under-classify character-performance shots.
- Verified Option 2 Phase 1 code-level behavior on July 21, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 22 tests, including the new hybrid still-lock profile and shot-class workflow routing coverage.
- Verified lightweight Option 2 Phase 1 artifact generation on `workspaces/test_story_template` by re-running `visual-character-bible` and generating `07_visuals/benchmark_pack/hybrid_still_benchmark_pack.{json,md}`.
- Current Option 2 Phase 1 evidence shows 4 character identity packages, 7 shot classes, and 26 approved-shot references in the generated benchmark pack, but most existing approved stills still predate the new shot-class templates and need a fresh rerun for final visual signoff.
- Verified Phase 6 code-level behavior on July 21, 2026: `node --test tests\\bricktoon_pipeline.test.js` passed all 20 tests, including the new reliability-gate coverage.
- Verified the new reliability gate against `workspaces/test_story_template`; it correctly produced a blocked result because the benchmark still has 5 hold-for-polish scenes, fallback ratio `0.577`, fragile-scene ratio `0.714`, and 2 scenes requiring review before finish.
- Phase 6 is started and behaving correctly, but overnight trust is not earned yet because the benchmark topic still fails the premium-preview reliability profile.
- Rebuilt `workspaces/test_story_template` compositing reports, scene-sequence reports, and render contracts after the first Phase 5 sequence-polish pass so benchmark evidence now includes continuity, pacing, subtitle-safe, and promotion-state metadata.
- Phase 5 is started and test-covered, but it is not complete; the benchmark still shows too many fallback-heavy scenes to call the final sequence premium-ready.
- Re-generated representative benchmark samples for `S02_SHOT_003`, `S04_SHOT_004`, and `S06_SHOT_002`, then re-ran the full `workspaces/test_story_template` shot-clip batch after the Phase 4 renderer upgrade.
- Phase 4 is now build-complete enough to move to the next implementation phase, but benchmark signoff is still pending because the result is stronger directed cutout motion, not yet the full premium acting target.

## 2026-07-20

### Added

- Added `docs/technical_docs/BRICKTOON_PREMIUM_QUALITY_MILESTONE_2_PLAN.md` as the planning source of truth for `Milestone 2: bricktoon_premium_quality`, locking the minimum animation-quality floor, the required capability set, and the three practical implementation-path options before further build work.
- Added phased execution tracks inside `docs/technical_docs/BRICKTOON_PREMIUM_QUALITY_MILESTONE_2_PLAN.md` for all three milestone paths so each option now has a concrete planning sequence before any JS implementation resumes.
- Added `scripts/build_library_catalog.js`, `library/general_assets/catalog_templates.json`, and `npm run library:catalog` so the shared reference library now has a reusable indexed catalog contract instead of only loose folders.
- Added shot-keyframe guidance helpers and a regression test so single-subject shots now explicitly prioritize hero character refs, enforce cast-visibility rules, and keep that behavior from silently drifting later.
- Added `docs/technical_docs/COMFYUI_STABILITY_AND_PREMIUM_KEYFRAME_IMPLEMENTATION_PLAN.md` as the focused multi-phase execution plan for moving ComfyUI runtime stability, shot keyframe quality, single-character lock, thumbnail match, and identity consistency from `PARTIAL`/`UNSTABLE` to `WORKING`.

### Changed

- Updated the main implementation-planning docs so they now explicitly align under `Milestone 2: bricktoon_premium_quality` and treat premium cut-out / puppet-style animation quality as a hard gate instead of an aspirational improvement.
- Updated the pipeline visual state board so it now shows milestone phase-track planning as locked while the final path decision remains open.
- Updated the pipeline visual state board so the active milestone gate, locked minimum capability floor, open path decision, and blocked proceed-past-gate status are visible in the shared status view.
- Updated the AI motion-pass stage so approved/generated keyframes can now be turned into real motion clips with recipe-based zoom, drift, and crossfade behavior before compositing.
- Updated stabilization so motion clips are normalized through FFmpeg before compositing instead of being passed through as raw copies when the render succeeds.
- Updated compositing reports so selected motion clips now record when the winning source came from keyframe-derived motion instead of only labeling everything as generic AI motion.
- Updated the pipeline visual state board so the shared catalog and premium-motion statuses reflect the current implementation more honestly.
- Updated shot-keyframe generation so it now builds stronger cast-lock, continuity, composition, and thumbnail-style contracts from `cast.json`, `visual_character_bible.json`, shot art direction, and composition guides instead of relying mostly on generic prompt text.
- Updated the ComfyUI provider so reference-led keyframes use lower-denoise img2img behavior, allowing the supplied character refs to influence identity and wardrobe lock more strongly.
- Updated managed shot-keyframe workflow defaults so premium still requests now carry stronger thumbnail-grade style cues and identity-drift negatives even outside the script-level prompt builder.

### Fixed

- Fixed a core motion-stage gap where `ai-video-motion-passes` claimed success while only copying the existing procedural shot clip instead of generating a motion pass from approved stills.
- Fixed a reusable-library gap where the shared catalog had folder scaffolding but no generated index to show what references and category slots were actually available for future topics.
- Fixed a core shot-generation gap where the first reference image used by the ComfyUI path could be a generic workspace image instead of the actual cast reference that should control hero-shot identity.
- Fixed a prompt-contract gap where closeups and medium singles could still carry secondary-cast noise, weakening single-character lock and increasing the chance of duplicate or off-model subjects.

## 2026-07-14

### Added

- Added `scripts/startup-script/start_comfyui.ps1` plus `npm run comfy:start` so the repo can launch the manual `C:\AI\ComfyUI-GTX1080` ComfyUI install from a single project-local command.
- Added a first-class `bricktoon-auto` orchestrator stage plus `npm run bricktoon:auto` so the premium bricktoon visual pipeline can run as one automatic command while the individual manual stages remain available.
- Added a preview-first bricktoon flow with `visual-preview`, `bricktoon-preview`, and `bricktoon-finish` stages plus npm shortcuts so we can inspect a slideshow of approved stills before paying for motion and final render.
- Added `scripts/generate_visual_preview.js` so approved keyframes can be turned into a quick slideshow MP4 at `06_renders/previews/visual_preview.mp4`.
- Added `config/asset_library.json`, `library/reference_images/`, and `library/general_assets/` so the project now has a shared reusable reference-and-asset library outside any single topic workspace.
- Added `04_assets/reference_manifest.json`, a `reference-sync` orchestrator stage, and `npm run reference-sync` so a topic can pull selected reusable references/categories into its workspace before generation.
- Added `docs/technical_docs/BRICKTOON_REFERENCE_LIBRARY_AND_PREVIEW_WORKFLOW.md` as the architecture note for the shared-library and preview-gate workflow.
- Added `docs/technical_docs/PIPELINE_STATE_VISUAL.md` as a visual status board showing what parts of the pipeline are working, partial, unstable, or still not production-ready.
- Added `docs/technical_docs/COMFYUI_GTX1080_QUICK_START.md` so the full manual ComfyUI startup path, `.env` settings, checkpoint location, and repo test commands are documented in one place for future reuse.
- Added `docs/technical_docs/COMFYUI_PORTABLE_SETUP.md` so the manual ComfyUI install can be recreated on another machine without retracing the full debugging trail.
- Added `docs/technical_docs/PROJECT_FULL_SETUP_GITHUB_TO_COMFY_RENDER.md` so the entire path from GitHub clone to Comfy-backed bricktoon render is documented as one repeatable setup flow.
- Added `docs/technical_docs/BRICKTOON_COMFYUI_IMPLEMENTATION.md` as the new source-of-truth implementation document for the ComfyUI-first bricktoon rendering path.
- Added `docs/technical_docs/VISUAL_REFERENCE_INTERPRETATION.md` so reference-driven quality targets are documented as style/quality matching rules instead of copy instructions.
- Added a repo-local `.env` loader so provider configuration now works from `.env` without requiring the shell to pre-export variables first.
- Added `config/visual_generation.json` so visual-provider defaults are centralized and the architecture can prefer OpenAI image generation while preserving fallback behavior.
- Added a first-class ComfyUI image provider for local asset-generation using the standard ComfyUI prompt/history/view API flow.
- Added a managed workflow-template registry, quality-tier mapping, and workflow-request/provider-report metadata layer for ComfyUI-first character refs, scene stills, and shot keyframes.
- Added a scene-sequence upgrade layer for bricktoon animation with new orchestrator stages: `scene-beats`, `shot-planner`, `bricktoon-shots`, and `scene-assembly`.
- Added `scripts/generate_scene_beats.js` so scene cards and timing data can be split into structured multi-beat visual sequences.
- Added `scripts/generate_shot_plan.js` so each scene beat becomes a concrete timed shot with framing, continuity, and camera instructions.
- Added `scripts/generate_bricktoon_shot_clips.js` so the pipeline now renders multiple procedural shot clips per scene instead of relying on one animated poster-style clip.
- Added `scripts/assemble_bricktoon_scene_sequences.js` so shot clips are concatenated into preferred scene-level assets.
- Added `src/bricktoon/proceduralSequenceRenderer.js` as the shared renderer for higher-variety shot compositions, closeups, inserts, and reaction framing.
- Added shot-level animation performance output at `08_animation/shot_performances.json`.
- Added test-story sequence outputs and preview evidence so the upgraded animation path can be inspected quickly during regression checks.
- Added the first Bricktoon 2 AI-quality pipeline layer with new orchestrator-backed stages for `visual-character-bible`, `visual-production-router`, `shot-art-direction`, `composition-guides`, `asset-generation`, `asset-consistency-validation`, `layer-extraction`, `character-rigging`, `ai-video-motion-passes`, and `shot-compositing`.
- Added `00_brief/visual_quality_profile.json` and `03_cast/visual_character_bible.json` as seeded workspace contracts for quality targeting and character continuity.
- Added provider-agnostic mock implementations for higher-quality keyframes, composition guides, layer manifests, clean plates, character rigs, AI-motion placeholders, and composited shot clips so the full architecture can run before a real external image/video provider is attached.
- Added an OpenAI image provider adapter and provider selector so character refs, scene stills, and shot keyframes can use `gpt-image-1` as the default architecture path.

### Changed

- Updated the orchestrator contract and npm scripts so the new shot-based stages are first-class workflow steps instead of side experiments.
- Updated `bricktoon:auto` to stop at the preview checkpoint instead of automatically spending more time on downstream motion/render work.
- Updated premium character-ref and shot-keyframe generation so workspace reference images can be included in the request contract and prompt shaping for future reference-driven bricktoon rendering.
- Updated the local ComfyUI provider to support a built-in img2img-style path when reference images are available, using ComfyUI input uploads rather than prompt-only generation.
- Updated visual preview generation so it now writes scene-divided preview clips and can attach available voiceover/music to the combined preview output.
- Updated the documented bricktoon default path so it now runs shared-library selection -> preview review -> finish render, instead of jumping straight into the most expensive stages.
- Updated the architecture so ComfyUI is now the default premium image provider, with repo-managed workflow ids deciding how character refs, scene stills, keyframes, and motion sources are requested.
- Updated visual-bible, layer-extraction, rigging, motion-pass, compositing, render-contract, and audit outputs so they carry richer continuity, selection-reason, and quality metadata instead of only output existence.
- Updated visual-provider configuration so ComfyUI is now the default premium image provider, OpenAI remains a supported compatibility option, and provider selection can now be controlled from `.env` as well as shell env.
- Updated render asset resolution to prefer `bricktoon_scene_sequence` over older animated and static bricktoon assets.
- Updated the bricktoon compatibility stage so `bricktoon-clips` now acts as a wrapper around the newer sequence pipeline rather than a separate legacy generator.
- Updated the condensed bricktoon technical guide so it reflects the current multi-shot animation workflow and troubleshooting path.
- Updated scene assembly and render planning so composited shot outputs can be preferred automatically while older procedural shot and scene assets remain valid fallbacks.
- Updated the bricktoon audit so the new AI-quality layer is included in implementation checks instead of living outside the existing audit path.
- Updated bricktoon image-generation scripts so they now prefer the configured OpenAI provider first and automatically fall back to mock generation when credentials are unavailable or the provider call fails.

### Fixed

- Fixed an encoding glitch in the portable ComfyUI setup doc so it now reads cleanly in plain text editors and terminal viewers.
- Fixed a wasteful pipeline gap where placeholder-like PNGs could be treated as valid premium outputs and still continue into expensive downstream stages; generated image validation now blocks obviously placeholder-sized image outputs.
- Fixed a workflow limitation where "animation" could still look like one held text card by introducing multiple timed shots inside a scene before final render assembly.
- Fixed a contract gap where premium image-generation stages could produce files but not the request/report metadata needed to rerun, debug, or audit a managed ComfyUI workflow stack.
- Fixed a QC/audit reliability gap where some missing premium-output artifacts could print as failures without actually affecting the final audit status.
- Fixed a ComfyUI workflow-template bug where baked-in template checkpoints could override the user-configured checkpoint from `.env`, causing valid local models to be rejected during prompt validation.
- Fixed a configuration gap where users could define image-provider settings in `.env` but the pipeline would ignore them unless the current shell session had already loaded those variables.
- Identified a local ComfyUI connectivity gap where the repo was targeting `127.0.0.1:8188` while the desktop app was configured to listen on `127.0.0.1:8000`.
- Identified an environment-layout gap where `C:\Users\admin\Documents\ComfyUI` contained models and a virtualenv but not the actual ComfyUI application entrypoint, while the installed desktop app lived under `C:\Users\admin\AppData\Local\Programs\ComfyUI`.
- Identified a local runtime compatibility gap on the GTX 1080 machine where ComfyUI could accept API requests and validate prompts but failed during execution with `CUDA error: no kernel image is available for execution on the device`, pointing to a bundled CUDA/PyTorch mismatch rather than a repo workflow bug.

### Notes

- Verified a refreshed `workspaces/test_story_template` speaking closeup poster after the Phase 3 renderer upgrade; the sample now shows visible bricktoon character performance instead of a background-only frame.

### Fixed

- Fixed a clip-render binding bug where `scene_cards.json` character labels like `narrator_001` could cause the shot-clip stage to render only the background because the actual renderable cast lived under `CAST_*` / `BT_CHAR_*` identifiers.
- Fixed a performance-compatibility bug where motion records keyed by `actor_id` / `cast_member_id` instead of `character_id` could silently fail to bind to a rendered character.
- Fixed a renderer robustness bug where null character-performance lookups could throw during shot rendering instead of degrading gracefully.

- Current recommended local ComfyUI integration path for the GTX 1080 workstation is a manual ComfyUI source install with Python 3.10 64-bit and a Pascal-friendly Torch/CUDA stack, instead of relying on the desktop bundle alone for production repo integration.
- Fixed a pipeline-readiness gap where shot generation and scene assembly could appear complete as soon as any file existed in the output folders; readiness now checks expected shot and scene coverage against planning data and approved manifest assets.
- Fixed a voice-stage gap where draft renders could contain a formal audio stream but no audible narration because the pipeline was normalizing silent placeholder WAVs; draft voice generation now attempts Windows built-in TTS first and only falls back to silence if synthesis is unavailable.
- Fixed an architecture gap where premium AI-quality visual work could be described in docs but had no orchestrator stages, seeded workspace outputs, or manifest-compatible fallback path in the executable pipeline.
- Fixed a provider gap where asset generation was still hardwired to the mock renderer even after the new AI-quality architecture introduced provider-agnostic contracts.

## 2026-07-09

### Added

- Created `docs/technical_docs/` as the home for technical change tracking and workflow notes.
- Added a repo-level `.gitignore` so generated workspace output is ignored by default.
- Added a persistent guided-pipeline status file per workspace via `guided_status.md`.
- Added guided orchestration commands `--guided` and `--full`.
- Added a topic restart command that wipes and recreates a workspace from its topic JSON.
- Added publishing-loop support for analytics review, topic scoring, and next-week planning.
- Added a QC stage that writes `quality_report.md`, `required_fixes.md`, `optional_improvements.md`, and `final_approval.md`.
- Added overnight queue processing with locking, resume support, and morning reports.
- Added a repo-level `config/music_policy.json` so music sourcing rules are centralized instead of living only in ad hoc notes.
- Added seeded workspace music-planning files in `04_assets/music/` so every topic documents its soundtrack choice before QC.
- Added the first bricktoon architecture layer with format recipes, style rules, schemas, and reusable character scaffolds.
- Added a dedicated `test_story_template` topic fixture plus npm shortcuts so pipeline changes can be regression-tested against a stable story.
- Added seeded research notes for `test_story_template` so guided-mode regression runs start with realistic input instead of an empty stub.
- Added seeded source rows and fact-table rows for `test_story_template` so the research stage can clear approval thresholds after a reset.
- Added a static pre-render snapshot plus `npm run test-story:render` so the regression fixture can restore known-good inputs and draft-render immediately.
- Added first-class bricktoon image-generation scripts for character refs, scene images, asset-manifest assembly, render-contract compilation, and implementation auditing.
- Added the first structured Bricktoon cast-architecture layer with reusable role vocabulary, archetype libraries, prop/environment libraries, cast-package schemas, deterministic cast compilation, and cast regression tests.
- Added the first real Bricktoon reference-intake records for user-supplied thumbnails, including approved trait abstractions and blocked-copy rules for future compliant asset generation.
- Added an orchestrator-integration contract plus an audit command so future architecture changes have an explicit checklist and do not get stranded outside guided/stage orchestration.
- Added an isolated procedural Bricktoon animation sample path so character-layer motion can be proven independently of placeholder generated scene art.

### Changed

- Standardized workspace generation to include publish analytics seed files and QC support files.
- Updated the orchestrator so guided/full mode can resume work and surface clear blockers.
- Updated the orchestrator so a topic can be reset back to a clean workspace and queue state.
- Updated the fake movers research package with official and regulator-backed sources so it can pass the research gate.
- Advanced `fake_moving_companies` through refreshed script, assets, render-plan, QC, and final 1080p export.
- Updated the render-plan stage to carry a selected music bed into scene metadata and audio planning notes.
- Updated repo guidance so the default soundtrack source is the local sorted royalty-free library, preferring `@all/good`.
- Updated the orchestrator to support format, angle, cast, scene-card, and animation/edit-plan stages on top of the legacy workflow.
- Updated the script, visual, render-plan, and QC stages so they can consume bricktoon preproduction files when present.
- Updated repo docs so the test-story fixture is the standard quick-check path after workflow changes.
- Updated workspace initialization so topic-specific fixture content can be backfilled into older test workspaces automatically.
- Updated `research_agent` so the test-story fixture loads template research CSVs instead of regenerating weak placeholder rows.
- Updated the test-story workflow so render checks can skip dynamic upstream generation and use a fixed snapshot for faster visual verification.
- Tightened the static test-render command so it verifies the produced draft file is non-trivial instead of only trusting the renderer exit code.
- Updated the orchestrator so bricktoon character generation, scene-image generation, manifest assembly, render-contract compilation, and bricktoon auditing are all callable as native stages and are included in guided/render flow.
- Updated the character and scene-card pipeline so `03_cast` now produces and consumes a real cast package: `cast_request.json`, `role_requirements.json`, `cast_continuity.json`, `scene_cast_map.json`, `prop_assignments.json`, `reference_usage.json`, `cast_validation.json`, and `cast_report.md`.
- Updated orchestrator readiness rules so guided mode now treats cast as a post-script package stage, requires a passing `cast_validation.json`, and automatically invalidates stale scene cards when cast data changes.
- Updated the reference system so branded thumbnail examples can be stored as analysis-only records with reusable trait extraction instead of being treated like directly copyable assets.
- Updated project skill guidance so orchestrator wiring is part of the definition of done for reusable pipeline architecture changes.
- Updated animation architecture direction to support a procedural proof layer first, so later AI-generated character parts can slot into a tested animation engine instead of hiding behind text-card renders.

### Fixed

- Fixed npm guided/full argument parsing so commands like `npm run guided -- --topic fake_moving_companies` work correctly.
- Fixed guided mode so partially-built topics resume instead of always forcing users back to empty manual notes.
- Fixed guided mode to save blocked/ready state to `guided_status.md`.
- Identified cross-topic contamination in crime-story outline/script generation where towing-specific language leaked into other topics.
- Identified a render-plan pacing bug where long scenes could never satisfy the 8-second visual-change rule because only 3 visuals were selected.
- Identified a research-seeding bug where manual-note title ideas and planning bullets were being treated as factual claims, inflating blocked-claim counts.
- Fixed crime-story outline generation to use topic-aware generic language instead of towing-specific copy.
- Fixed crime-story script generation so moving topics no longer inherit tow-truck narration and visuals.
- Fixed research seeding to ignore title ideas, search queries, and other planning bullets that are not factual claims.
- Fixed visual-asset generation to create draft-safe generated support cards for every scene.
- Fixed render-plan pacing to select enough visuals for longer scenes and duplicate safe fallbacks when needed for draft timing.
- Fixed QC visual checks to allow unresolved manual placeholders when a scene already has generated draft fallback assets.
- Fixed source validation so general scam-context statistics are not treated like legal accusations just because they contain words like `scam` or `fraud`.
- Fixed the malformed Canada regulator fact row in `fake_moving_companies` research data.
- Fixed the `fake_moving_companies` workspace so research, visuals, and QC now pass end to end.
- Fixed the renderer itself so it now attempts to render actual scene assets before falling back to text cards.
- Added workflow enforcement that final export requires a visual plan plus minimum real visual/stock asset counts.
- Added guided-mode blocking for missing stock footage and weak real-visual coverage.
- Switched generated chart/fact-card outputs from SVG-only to PNG assets so the renderer can use them reliably on this machine.
- Fixed Windows FFmpeg concat path handling in the visual-first renderer.
- Re-ran `fake_moving_companies` under the stricter visual rules so it is now correctly blocked on missing real footage instead of falsely appearing complete.
- Fixed a workflow gap where music selection had no standard location, no approved-library rule, and no QC validation.
- Fixed future-topic drift by teaching QC to reject tracks chosen from outside the approved library or directly from the unsorted root of `@all`.
- Fixed the architecture gap where character-driven cartoon storytelling existed only in planning docs but not in the executable pipeline.
- Fixed a workflow gap where the new bricktoon visual scripts existed but were not yet attached to orchestrator stage dispatch, guided sequencing, or render preparation.
- Fixed a long-term architecture gap where cast creation only wrote a flat `cast.json`, leaving no deterministic role extraction, continuity rules, prop mapping, scene cast assignments, or testable validation contract for future visual generation.
- Fixed an orchestrator mismatch where the new cast architecture could still run in the old order and be marked ready by a thin `cast.json` check even when script-driven cast outputs were stale or incomplete.
- Fixed a future asset-safety gap by documenting brand/logo/storefront elements from user-supplied references as explicit `do_not_copy` and `blocked_traits` data before those examples reach prompt generation.
- Fixed a process gap where architecture changes could be implemented in code or docs but forgotten in orchestrator integration because there was no persistent contract or audit reminder.
- Fixed a core validation gap where “animation” could appear successful even when the output was just text or placeholder art, by creating a sample that must animate independently controlled character layers and produce inspectable evidence frames.

- Fixed a cast-schema drift bug where bricktoon visual-generation scripts could still read only the legacy flat `cast` array and silently miss the newer `cast_members` package format.
- Added a first-class `bricktoon-clips` orchestrator stage that generates approved procedural `bricktoon_animated_clip` assets from the current cast package, scene cards, and animation plan so render planning can prefer moving character scenes over static placeholders.
- Fixed a workspace-bloat gap by cleaning up per-scene temporary frame folders after procedural clip encoding completes.
- Consolidated the split bricktoon architecture and implementation docs into a single condensed guide at `docs/technical_docs/BRICKTOON_PIPELINE_GUIDE.md`.
- Removed the now-redundant top-level bricktoon architecture/implementation markdown files so there is one primary technical reference instead of parallel docs drifting apart.

### Process

- Any fix discovered while working, even if incidental to the main request, must be documented in this change log.
- When an implementation phase is completed, the phase is not fully closed until its implementation report is written and linked from the milestone docs and reflected in this change log.

### July 22, 2026 Motion Pass Follow-Up

#### Changed

- Updated `scripts/composite_bricktoon_shots.js` so speaking, reaction, exchange, and insert-heavy shots now prefer repo-side procedural performance clips over still-derived motion drift when those clips are available.
- Updated `src/bricktoon/workflowContracts.js` so `bricktoon_shot_clip` assets are classified as motion-capable instead of fallback-quality placeholders.
- Updated `src/bricktoon/proceduralSequenceRenderer.js` so the procedural bricktoon stage now derives scene-aware environments from scene narration and applies stronger motion-aware background decoration instead of reusing one generic storefront wall across most scenes.
- Added scene-environment regression coverage to `tests/bricktoon_pipeline.test.js` so scene-context routing does not quietly collapse back into one visual set.

#### Fixed

- Fixed the immediate render-truth failure where the final draft could pass through compositing while selecting weaker stabilized still-motion instead of the richer procedural acting clips.
- Fixed the worst slideshow failure mode for `test_story_template`: the render-output proof no longer blocks because of zero meaningful motion or fallback-document dominance.

#### Current Result

- `workspaces/test_story_template/06_renders/draft_01.mp4` now uses procedural shot clips throughout the topic instead of collapsing to static-like stabilized drifts.
- The render-output proof is still intentionally blocked for two remaining reasons:
- audio bitrate remains far below the configured floor
- sampled frames remain too repetitive for premium approval
- Verified current state:
- motion exists and is measurable
- fallback shot spread is cleared
- premium visual diversity is still not good enough yet

#### Next Fix Target

- Strengthen scene-to-scene visual identity further so different scenes stop reading like the same puppet stage with new captions.
- Raise real audio presence so the proof gate can evaluate a usable narration/music layer instead of near-silent AAC output.
