# Interactive visual learning engine

The Diagram Learning Studio combines authored React Flow diagrams with a set of deterministic interactive examples. It preserves ordinary lesson text and is available at `/diagrams`.

## Included examples

- **Binary search:** a checked, sorted-array trace with target input, active range, comparison state, and step controls.
- **Bubble sort:** an editable five-value input with adjacent comparisons, swap states, output, and complexity.
- **Recursion:** a factorial call stack showing the base case and returned values.
- **Dynamic programming:** a Fibonacci state table whose values can be inspected individually.
- **Stack:** push/pop states showing last-in, first-out behavior.
- **Python loop trace:** a fixed, reviewed trace showing the active code line, variable values, reads, and output. This is a simulation and does not execute arbitrary code.
- **Equation solving:** paired transformations for `2x + 4 = 10`, including a substitution check.
- **Calculus:** an adjustable secant interval approaching a tangent and midpoint rectangles approximating an integral.
- **Projectile motion:** an SVG trajectory derived from constant-gravity equations, with adjustable launch speed, launch angle, and simulation time. It labels the model as idealized without air resistance.
- **Project architecture:** a stepwise login workflow across user, frontend, API, backend, authentication, and database responsibilities.

The shared interface provides combined/text/visual layouts, play/pause, forward/back, restart, speed, explanation visibility, and fullscreen for the visual panel. The current step is saved per authenticated user in `settings.visualLearningProgress` through `/api/visual-progress` and restored on return.

## Adding a visualization

1. Add deterministic domain logic to `src/lib/visual/engine.ts`; keep rendering out of this module so the logic can be tested independently.
2. Add an entry to the typed `visualizations` list and rendering/input state in `src/components/visual/visual-learning-engine.tsx`.
3. Connect explanation anchors to a domain state using `selectTextAnchor`, and ensure the controls and progress step reflect the same state.
4. Add Bengali interface strings to `src/lib/i18n.ts` and tests for state transitions or calculations in `tests/visual-engine.test.ts`.
5. For course-specific content, author structured block translations and visual mappings in the course editor; do not claim that a hand-authored trace executed arbitrary learner code.

Per-user progress retains the last position, distinct visited steps, a bounded interaction history, assessment outcomes, and an estimated time counter. Progress is an exploration record, not evidence of mastery. Use a checked exercise or assessment for competency decisions.
