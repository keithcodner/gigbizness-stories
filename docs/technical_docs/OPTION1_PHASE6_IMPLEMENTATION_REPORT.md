# Option 1 Phase 6 Implementation Report

Status: not complete

Last updated: July 22, 2026

Related milestone:

- `docs/technical_docs/BRICKTOON_PREMIUM_QUALITY_MILESTONE_2_PLAN.md`

Related change log:

- `docs/technical_docs/CHANGELOG.md`

## Purpose

This report tracks the current implementation state of `Milestone 2 -> Option 1 -> Phase 6: Overnight Reliability`.

The job of this phase is not just to block unsafe exports. The job is to make overnight bricktoon finishing behave predictably on the GTX 1080 path, recover clearly when blocked, and produce evidence that higher-level milestone decisions can trust.

## Planned Scope

Phase 6 was supposed to deliver:

- pinned GTX 1080 runtime profiles
- a reusable reliability gate
- preview-to-finish approval logic
- resumable overnight execution
- runtime-tier-aware finish gating
- stable rerun behavior after blocked or failed attempts
- reporting clear enough that blocked states are diagnosable without manual digging

## What Was Completed

- Added `config/bricktoon_runtime_profiles.json` so preview, premium-preview, and overnight-finish behavior is explicitly pinned to GTX 1080-safe runtime tiers.
- Added `src/bricktoon/reliabilityGate.js` so preview, sequence, render-contract, QC, fallback, fragile-scene, and unresolved-asset readiness all flow through one reusable contract.
- Added `scripts/build_bricktoon_reliability_report.js` so each workspace can emit `bricktoon_reliability_report.{json,md}` before expensive finish attempts.
- Added `agents/bricktoon_overnight_agent.js` so overnight execution is stateful and resumable instead of depending on one-shot manual discipline.
- Added `src/bricktoon/reliabilityRecoveryPlan.js` plus `scripts/build_bricktoon_recovery_plan.js` so blocked reliability runs now emit a ranked scene-recovery package instead of forcing manual diagnosis across multiple reports.
- Added `src/bricktoon/sceneReviewClearance.js` plus `scripts/build_bricktoon_scene_review.js` so review-required scenes now emit a governed review packet and reusable review-decision file.
- Added `src/bricktoon/sceneSelection.js` plus scoped rerun support across keyframe generation, validation, motion, compositing, and scene assembly so expensive recovery work can now target only queued scenes without wiping the rest of the topic reports.
- Updated `agents/orchestrator.js` so `bricktoon-reliability`, `bricktoon-recovery-plan`, and `bricktoon-overnight` are first-class stages, and `bricktoon-finish` can enforce runtime-profile gates.
- Updated `agents/orchestrator.js` so `bricktoon-scene-review` is now a first-class stage and `bricktoon-reliability` automatically refreshes the review packet before writing the recovery plan.
- Updated `agents/orchestrator.js` and `package.json` so `bricktoon-scene-recovery` / `npm run bricktoon:scene-recovery` are now first-class entrypoints for queued scene rework instead of forcing operators to rerun whole-topic expensive stages.
- Updated `package.json` so `npm run bricktoon:recovery` is now a first-class shortcut for the new recovery-planning layer.
- Updated `package.json` so `npm run bricktoon:scene-review` is now a first-class shortcut for the new review-clearance layer.
- Updated `src/bricktoon/reliabilityGate.js` so approved review scenes can stop counting as unresolved review blockers once `bricktoon_scene_review_decisions.json` is filled in.
- Hardened the overnight state contract so the runner now records:
  - `status`
  - `current_step`
  - `step_history`
  - `last_reliability_decision`
  - `blocked_reason`
  - `last_error`
  - `run_count`
  - `resume_count`
- Added `bricktoon_overnight_report.{json,md}` output so overnight progress and failure context are visible without reading raw state JSON.
- Aligned overnight-trial interpretation across:
  - `src/bricktoon/hybridProductionReadiness.js`
  - `src/bricktoon/professionalSemiAutomationDecision.js`
  so the repo now consistently treats overnight proof as `passed`, `partial`, or `not_recorded`.
- Added `src/bricktoon/benchmarkSceneProof.js` and `scripts/build_benchmark_scene_proof.js` so the promoted benchmark scene can now be packaged and rendered as its own governed proof artifact instead of requiring a whole-topic finish attempt.
- Added `benchmark-scene-proof` orchestration plus `npm run bricktoon:benchmark-proof`, giving the repo a benchmark-only proof path that respects the selected-scene promotion gate.
- Fixed a benchmark-scene reliability bug so imported professional benchmark scene selections now override stale pre-reintegration scene-sequence fallback metrics when the benchmark proof path is evaluated.
- Added `src/bricktoon/artifactFreshness.js` plus new freshness-aware readiness checks so route, motion, compositing, and scene-sequence artifacts no longer count as trustworthy merely because a file exists.
- Updated `agents/orchestrator.js` so stale hybrid contracts, motion-pass reports, compositing reports, and scene-sequence reports now trigger rebuild behavior instead of silently preserving older fallback decisions.
- Updated `scripts/build_bricktoon_reliability_report.js` and `src/bricktoon/reliabilityGate.js` so reliability can now explicitly block stale downstream artifacts and list them in the report instead of hiding the problem behind generic scene quality symptoms.
- Added regression coverage for:
  - reliability gate blocking behavior
  - overnight blocked-state summarization
  - overnight report snapshots
  - professional route classification when overnight proof is present

## What Was Missed

- No governed successful overnight finish has been recorded yet on the benchmark topic.
- The benchmark still fails the premium reliability gate for real quality reasons, so the overnight path cannot yet be called trusted in practice.
- Human approval still matters before expensive finish decisions because the benchmark remains fallback-heavy in several scenes.
- We improved failure recovery and reporting, but we still have not proven the full overnight path through a clean end-to-end premium run.
- The new recovery queue makes the remaining work clearer, but it does not remove the need to actually improve scenes `S01`, `S02`, `S03`, `S05`, `S06`, and `S07`.
- The new review-clearance layer still requires a human or later assisted reviewer to mark `S01` and `S02` approved before those review blockers can disappear.
- The new scene-scoped recovery layer reduces wasted rerun cost, but it does not yet prove that long ComfyUI still generation is stable enough to clear the remaining `light_rework` and `heavy_rework` buckets unattended.

## Gaps Found And Filled

- A contract mismatch existed between overnight-state reporting and higher-level decision logic.
  - `professionalSemiAutomationDecision` was looking for overnight status `recorded`.
  - `hybridProductionReadiness` actually emits `passed`, `partial`, or `not_recorded`.
  - This is now aligned.
- Overnight evidence was previously split across state and reliability files without a dedicated run report.
  - The repo now emits a first-class overnight report artifact.
- Resume behavior was previously technically present but thin.
  - The runner now persists current step, event history, block reasons, failure reasons, run counts, and resume counts.
- The production-readiness layer previously had weaker visibility into what kind of overnight state existed.
  - It now distinguishes completed, blocked, failed, and partial overnight states more clearly.
- The reliability layer previously had no clean way to judge the promoted benchmark scene independently from the still-weak full topic.
  - It now supports a benchmark-selected scope and emits a separate benchmark reliability report.
- The reliability layer previously blocked honestly, but still left the "what should we fix next?" answer scattered across scene-sequence, promotion-gate, and render-contract artifacts.
  - It now emits `bricktoon_recovery_plan.{json,md}` with a ranked queue, bucketed scene groups, and recommended rerun commands.
- Review-required scenes previously had no governed approval surface.
  - The repo now emits `bricktoon_scene_review_packet.{json,md}` plus `bricktoon_scene_review_decisions.json`, and the reliability layer can respect approved review decisions.
- A stale-artifact gap existed between production-route changes and downstream motion/compositing outputs.
  - The route file could be correct while hybrid contracts or compositing reports still reflected older fallback classifications.
  - The repo now has freshness-aware rebuild checks plus explicit stale-artifact blocking in the reliability report.
- The medium hybrid bridge shots were previously vulnerable to carrying old procedural-fallback decisions even after the route heuristic was fixed.
  - Live refresh on Wednesday, July 22, 2026 now shows `S03_SHOT_002`, `S04_SHOT_002`, `S05_SHOT_002`, `S06_SHOT_002`, and `S07_SHOT_002` selecting `stabilized_motion_pass` in `08_animation/compositing_reports/compositing_report.json`.
- The recovery queue previously told us which scenes to fix next, but it still left the expensive rerun process manual and topic-wide.
  - The repo now has a scene-scoped recovery execution layer that can rerun queued scenes only, merge updated shot/scene reports back into the full topic state, and refresh preview/gate/reliability outputs afterward.

## Expected Vs Unexpected

### What We Expected

- The reliability gate would block the benchmark for valid quality reasons before the overnight path was trustworthy.
- GTX 1080-safe runtime profiles would need stricter gating than a stronger GPU path.
- Resume behavior would become important quickly once the overnight runner existed.

### What We Did Not Expect

- The overnight evidence vocabulary drift was more significant than it first looked, because it affected downstream milestone decisions rather than only one runner file.
- The benchmark blocker pattern remained concentrated even after the benchmark-scene normalization fix, but the live rerun was better than the stale earlier report:
  - 4 hold-for-polish scenes
  - fallback ratio `0.462`
  - fragile scene ratio `0.571`
  - 2 review-required scenes
- The gate itself is now more trustworthy than the output it is judging, which is useful, but it means Phase 6 still cannot close cleanly.
- The selected benchmark scene was actually recoverable into a clean proof path once the reliability layer respected the imported professional scene asset instead of stale scene-sequence metadata.
- The next reliability gap was not another overnight-state field problem; it was downstream freshness.
  - Once production routes changed, stale hybrid/compositing artifacts could keep older fallback judgments alive until manually rerun.
  - That behavior is now guarded in code and visible in the reliability contract.
- Once freshness was fixed, the next operational cost problem was rerun scope rather than artifact truth.
  - The repo was technically diagnosable, but still too expensive operationally because light scene repairs implied whole-topic expensive stage reruns.
  - Scene-scoped recovery now closes that operational gap even though full quality trust is still blocked.

## Evidence

- `node --test tests\\bricktoon_pipeline.test.js` passed 61 tests on Wednesday, July 22, 2026.
- `node --test tests\\bricktoon_pipeline.test.js` now passes 64 tests on Wednesday, July 22, 2026.
- `node agents\\orchestrator.js --topic test_story_template --stage hybrid-production-readiness --runtime-profile gtx1080_premium_preview` completed successfully and kept the governed verdict at `keep_option2_in_benchmark_mode`.
- `node agents\\orchestrator.js --topic test_story_template --stage professional-semi-automation --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview` completed successfully and kept the route classification at `benchmark_route_only`.
- `workspaces/test_story_template/10_qc/bricktoon_reliability_report.md` continues to block premium finish for concrete reasons rather than vague readiness language.
- `workspaces/test_story_template/10_qc/bricktoon_scene_review_packet.md` now exists and seeds governed pending review records for `S01` and `S02`.
- `workspaces/test_story_template/10_qc/bricktoon_scene_review_decisions.json` now exists and is the file the gate can honor when review scenes are approved.
- `workspaces/test_story_template/10_qc/bricktoon_recovery_plan.md` now exists and translates the blocked reliability state into a ranked recovery queue: `S01`, `S02`, `S03`, `S06`, `S07`, `S05`, with `S04` isolated as benchmark proof.
- `workspaces/test_story_template/10_qc/hybrid_production_readiness_report.md` and `workspaces/test_story_template/10_qc/professional_semi_automation_report.md` still hold their earlier governed outcomes after the overnight-contract hardening.
- `npm run bricktoon:benchmark-proof -- --topic test_story_template` completed successfully on Wednesday, July 22, 2026.
- `workspaces/test_story_template/10_qc/bricktoon_benchmark_reliability_report.md` now records a clean benchmark-scoped proof verdict for promoted scene `S04`.
- `workspaces/test_story_template/10_qc/benchmark_scene_proof_report.md` now records the governed proof package for `S04`, and `workspaces/test_story_template/06_renders/benchmark_scene_proof.mp4` now exists as the rendered sample output.
- `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-reliability --runtime-profile gtx1080_premium_preview` now also writes `bricktoon_recovery_plan.{json,md}` automatically after the reliability report.
- `node --test tests\\bricktoon_pipeline.test.js` now passes 68 tests on Wednesday, July 22, 2026, including the new artifact-freshness and stale-downstream-reliability coverage.
- `node agents\\orchestrator.js --topic test_story_template --stage hybrid-animation-contract` completed successfully on Wednesday, July 22, 2026 and refreshed the hybrid contract so the medium bridge shots now resolve as `hybrid_2d_ai`.
- `node scripts\\composite_bricktoon_shots.js --workspace workspaces\\test_story_template` completed successfully on Wednesday, July 22, 2026, and `workspaces/test_story_template/08_animation/compositing_reports/compositing_report.json` now selects `stabilized_motion_pass` for `S03_SHOT_002`, `S04_SHOT_002`, `S05_SHOT_002`, `S06_SHOT_002`, and `S07_SHOT_002`.
- `node scripts\\build_bricktoon_reliability_report.js --workspace workspaces\\test_story_template --runtime-profile gtx1080_premium_preview` now blocks only for scene quality/review reasons and no longer reports stale downstream artifacts.
- `node --test tests\\bricktoon_pipeline.test.js` now passes 70 tests on Wednesday, July 22, 2026, including new scene-selection and scoped-report-merge coverage for scene recovery.
- `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-scene-recovery --bucket manual_review --runtime-profile gtx1080_premium_preview` completed successfully on Wednesday, July 22, 2026 and refreshed review, reliability, and recovery artifacts through the new governed recovery entrypoint.

## Remaining Follow-Up Pressure

- Record a real governed overnight run that clears the premium runtime profile.
- Reduce the remaining review and hold scenes until the benchmark can pass the reliability gate honestly.
- Use the scene-review packet to clear `S01` and `S02` first, then convert at least one fragile hold scene out of the `S03` / `S06` / `S07` bucket before tackling `S05`.
- Use `bricktoon-scene-recovery` for `light_rework` and `heavy_rework` buckets instead of burning full-topic expensive reruns while closing the remaining scene-quality blockers.
- Continue tightening edge cases where a resumed run might be technically valid but still operationally ambiguous, but the next main pressure is now scene quality rather than stale dependency handling.
- Keep reporting strong enough that blocked, failed, and partial overnight runs are easy to diagnose from artifacts alone.
- Keep the benchmark-proof path honest by treating it as proof of the selected scene only, not as permission to skip the full-topic reliability gate.

## Final Assessment

`not complete`

Reason:

Phase 6 now has a stronger technical foundation and much better evidence discipline, but it still lacks the one thing that matters most for closure: a real benchmark overnight success case under the premium path. The code is substantially more trustworthy than before, yet the benchmark output is still correctly blocked, so this phase remains unfinished.
