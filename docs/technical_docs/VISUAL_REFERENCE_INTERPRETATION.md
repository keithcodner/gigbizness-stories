# Visual Reference Interpretation

When a bricktoon request says a shot or scene should "look like" a reference, the reference is treated as a benchmark for:

- production quality
- polish
- lighting
- depth
- material rendering
- composition strength
- movement quality
- expression quality
- cinematic energy

It is not permission to copy:

- exact characters
- identities
- branding
- logos
- legal claims
- on-image text
- layouts
- scene-specific facts

```json
{
  "reference_matching": {
    "match_quality": true,
    "match_polish": true,
    "match_lighting": true,
    "match_depth": true,
    "match_movement_quality": true,
    "copy_exact_composition": false,
    "copy_exact_characters": false,
    "copy_exact_branding": false,
    "copy_exact_text": false
  }
}
```

Pipeline rule:

- references are quality benchmarks
- the orchestrator remains the authority for story truth, continuity, text accuracy, legal wording, and final asset routing
