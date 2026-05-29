# Visual Diff Iteration 1 After Real Contracts

Run command: `npm run vd:loop`
Result: 2/24 PASS, 22 FAIL, 0 WARN.
Interpretation: this is an honest failure report. The repaired contracts now assert visible text, controls, visual markers, style samples, and pixel residuals instead of passing empty screens. No shipped React/CSS fixes were made in this pass.

| Screen | Status | Residual | Failure count |
| --- | --- | ---: | ---: |
| signin-all-ok | FAIL | 1.74% | 40 |
| repo-browse-empty-search | FAIL | 1.36% | 15 |
| repo-browse-repo-selected | FAIL | 5.03% | 31 |
| workspace-titlebar-closed-menus | FAIL | 9.41% | 15 |
| workspace-titlebar-repo-dropdown-open | FAIL | 3.23% | 34 |
| workspace-titlebar-gear-menu-open | FAIL | 3.19% | 19 |
| stepper-specify-current | FAIL | 10.88% | 24 |
| stepper-clarify-current | FAIL | 10.74% | 24 |
| stepper-plan-current | FAIL | 10.73% | 24 |
| stepper-tasks-current | FAIL | 10.74% | 24 |
| stepper-analyze-current | FAIL | 10.74% | 24 |
| stepper-review-current | FAIL | 10.74% | 24 |
| specify-input | FAIL | 3.23% | 19 |
| specify-running | FAIL | 3.35% | 14 |
| specify-complete | FAIL | 3.89% | 34 |
| activity-rail-idle | FAIL | 5.3% | 28 |
| activity-rail-busy | FAIL | 5.77% | 28 |
| activity-pill-idle | FAIL | 19.05% | 8 |
| activity-pill-busy | FAIL | 20.36% | 8 |
| customize-modal | FAIL | 16.51% | 25 |
| about-modal | FAIL | 12.13% | 24 |
| request-modal | FAIL | 10.63% | 31 |
| signin-fresh | PASS | 6.25% | 0 |
| signin-github-ok | PASS | 5.97% | 0 |

## signin-all-ok: FAIL

Pixel residual: 1.74%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/pick repo'
- [elements] missing text: expected 'pick repo'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'default'
- [elements] missing text: expected 'Choose a Collette-travel repo to scope spec-kit to.'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected '4 sessions'
- [elements] missing text: expected '2h ago'
- [elements] missing text: expected 'concierge-web'
- [elements] missing text: expected '2 sessions'
- [elements] missing text: expected 'yesterday'
- [elements] missing text: expected 'concierge-mobile'
- [elements] missing text: expected '1 session'
- [elements] missing text: expected '3d ago'
- [elements] missing text: expected 'booking-engine'
- [elements] missing text: expected '1w ago'
- [elements] missing text: expected 'All repos'
- [elements] missing text: expected 'itinerary-service'
- [elements] missing text: expected 'new'
- [elements] missing text: expected 'pricing-rules'
- [elements] missing text: expected 'guest-profile-svc'
- [elements] missing text: expected 'supplier-sync'
- [elements] missing text: expected 'loyalty-ledger'
- [elements] missing text: expected 'ops-dashboard'
- [elements] missing text: expected 'concierge-shared-ui'
- [elements] missing text: expected 'incident-bot'
- [elements] missing text: expected 'voucher-redeem'
- [elements] missing text: expected 'data-warehouse-etl'
- [elements] wrong control count: expected button 'a.kim' x1, got 0
- [elements] wrong control count: expected button 'collette-travel/pick repo' x1, got 0
- [elements] wrong control count: expected button 'Claude Sonnet 4.5default' x1, got 0
- [elements] wrong control count: expected button 'concierge-api4 sessions2h ago' x1, got 0
- [elements] wrong control count: expected button 'concierge-web2 sessionsyesterday' x1, got 0
- [elements] wrong control count: expected button 'concierge-mobile1 session3d ago' x1, got 0
- [elements] wrong control count: expected button 'booking-engine1 session1w ago' x1, got 0
- [elements] wrong control count: expected button 'itinerary-servicenewmain' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [styles] missing style sample: repo card action

Extra shipped items observed:
- text: collette-travel/hello-world-fixturemain - TypeScriptDeterministic Run 6 fixture
- text: main - TypeScript
- text: Deterministic Run 6 fixture
- text: 0.1.0
- text: test-acp-adapter 0.0.0:test-model
- control: button:collette-travel/hello-world-fixturemain - TypeScriptDeterministic Run 6 fixture

Proposed shipped-component fixes:
- Drive the shipped all-auth setup to the repository browser state instead of leaving captured text/AOM empty or off-state.
- Align repository browser titlebar chips with design: identity pill, org/repo chip, and Claude Sonnet 4.5 default model pill.
- Render the full recent/all repo lists with the design card labels and add brand-orb vd marker.

## repo-browse-empty-search: FAIL

Pixel residual: 1.36%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/pick repo'
- [elements] missing text: expected 'collette-travel'
- [elements] missing text: expected '/'
- [elements] missing text: expected 'pick repo'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'default'
- [elements] missing text: expected 'Choose a Collette-travel repo to scope spec-kit to.'
- [elements] missing text: expected 'No repos match "zzzz"'
- [elements] wrong control count: expected button 'a.kim' x1, got 0
- [elements] wrong control count: expected button 'collette-travel/pick repo' x1, got 0
- [elements] wrong control count: expected button 'Claude Sonnet 4.5default' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [styles] missing style sample: repo browser empty state

Extra shipped items observed:
- text: 0.1.0
- text: test-acp-adapter 0.0.0:test-model

Proposed shipped-component fixes:
- Render the signed-in titlebar and repo browser empty-search copy exactly as design.
- Expose titlebar chip buttons with design accessible names.
- Add brand orb marker and repo-browser empty-state chrome matching the design.

## repo-browse-repo-selected: FAIL

Pixel residual: 5.03%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/pick repo'
- [elements] missing text: expected 'collette-travel'
- [elements] missing text: expected '/'
- [elements] missing text: expected 'pick repo'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'default'
- [elements] missing text: expected '← All repos'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'Resume a prior session or start fresh from main.'
- [elements] missing text: expected '4 prior sessions'
- [elements] missing text: expected 'spec/0042-self-serve-flight-change'
- [elements] missing text: expected 'Plan'
- [elements] missing text: expected '2h ago'
- [elements] missing text: expected 'spec/0039-loyalty-tier-refund-rules'
- [elements] missing text: expected 'Review'
- [elements] missing text: expected '3d ago'
- [elements] missing text: expected 'spec/0037-companion-pnr-merge'
- [elements] missing text: expected 'Tasks'
- [elements] missing text: expected '1w ago'
- [elements] missing text: expected 'spec/0033-rate-card-renewals'
- [elements] missing text: expected 'Clarify'
- [elements] missing text: expected '2w ago'
- [elements] missing text: expected 'from main'
- [elements] wrong heading level 1: expected 'concierge-api', got 'hello-world-fixture'
- [elements] wrong control count: expected button '← All repos' x1, got 0
- [elements] wrong control count: expected button 'spec/0042-self-serve-flight-changePlan2h ago' x1, got 0
- [elements] wrong control count: expected button 'Start a new sessionfrom main' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [styles] missing style sample: session row card

Extra shipped items observed:
- text: hello-world-fixture
- text: hello-world-fixture sessions
- text: 0.1.0
- text: test-acp-adapter 0.0.0:test-model
- control: heading:hello-world-fixture
- control: heading:hello-world-fixture sessions
- control: button:Start a new session

Proposed shipped-component fixes:
- Use design selected-repo view: back affordance, concierge-api heading, prior session rows, and Start a new session from main action.
- Fix fixture/setup mismatch that currently lands on hello-world-fixture instead of concierge-api.
- Add brand orb marker and session-row card styling.

## workspace-titlebar-closed-menus: FAIL

Pixel residual: 9.41%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/concierge-api'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'main'
- [elements] wrong control count: expected button 'a.kim' x1, got 0
- [elements] wrong control count: expected button 'collette-travel/concierge-api' x1, got 0
- [elements] wrong control count: expected button 'main' x1, got 0
- [elements] wrong control count: expected button 'Claude Sonnet 4.5default' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [elements] missing visual marker: expected 'auth-identity-dot' at [data-vd-role="auth-identity-dot"]
- [styles] missing style sample: titlebar repo chip
- [styles] missing style sample: titlebar gear icon button
- [pixels] cropped pixel residual 9.41% exceeds 7%

Extra shipped items observed:
- text: Concierge
- text: collette-travel/hello-world-fixture
- text: spec/draft-mppu5adl
- text: Ready · Atlassian Run 11
- text: Settings
- control: button:collette-travel/hello-world-fixture
- control: button:spec/draft-mppu5adl
- control: button:Ready · Atlassian Run 11
- control: button:default
- control: button:Settings

Proposed shipped-component fixes:
- Rebuild titlebar chips to match design: brand orb, identity pill, org/repo chip, branch chip, Claude Sonnet 4.5 DEFAULT model pill, icon-only gear.
- Remove Ready/Atlassian/default wording drift from auth/model chips.
- Add vd markers for brand orb and auth identity dot; sample repo chip and gear icon button chrome.

## workspace-titlebar-repo-dropdown-open: FAIL

Pixel residual: 3.23%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/concierge-api'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'main'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected '4'
- [elements] missing text: expected '2h ago'
- [elements] missing text: expected 'concierge-web'
- [elements] missing text: expected '2'
- [elements] missing text: expected 'yesterday'
- [elements] missing text: expected 'concierge-mobile'
- [elements] missing text: expected '3d ago'
- [elements] missing text: expected 'booking-engine'
- [elements] missing text: expected '1w ago'
- [elements] missing text: expected 'All repos'
- [elements] missing text: expected 'itinerary-service'
- [elements] missing text: expected 'pricing-rules'
- [elements] missing text: expected 'guest-profile-svc'
- [elements] missing text: expected 'supplier-sync'
- [elements] missing text: expected 'loyalty-ledger'
- [elements] missing text: expected 'ops-dashboard'
- [elements] missing text: expected 'concierge-shared-ui'
- [elements] missing text: expected 'incident-bot'
- [elements] missing text: expected 'voucher-redeem'
- [elements] missing text: expected 'data-warehouse-etl'
- [elements] wrong control count: expected button 'a.kim' x1, got 0
- [elements] wrong control count: expected button 'concierge-api42h ago' x1, got 0
- [elements] wrong control count: expected button 'itinerary-servicemain' x1, got 0
- [elements] wrong control count: expected button 'Claude Sonnet 4.5default' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [styles] style drift on repo dropdown menu.background-color: expected 'oklch(0.165 0.003 280)', got 'rgb(17, 23, 27)'
- [styles] style drift on repo dropdown menu.box-shadow: expected 'oklch(0 0 0 / 0.7) 0px 24px 48px -16px, oklch(0.285 0.006 280) 0px 0px 0px 1px', got 'rgba(0, 0, 0, 0.78) 0px 30px 80px -24px, rgb(60, 77, 85) 0px 0px 0px 1px'

Extra shipped items observed:
- text: Concierge
- text: collette-travel/hello-world-fixture
- text: Repository
- text: Open repository browser
- text: Refresh repositories
- text: spec/draft-mppu5bpd
- text: Ready · Atlassian Run 11
- text: Settings
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review
- text: Step 1
- text: Specify
- text: Begin Specify
- text: Copilot connected⌄
- text: Copilot connected
- text: ⌄
- text: 0.1.0
- text: test-acp-adapter 0.0.0:test-model
- control: button:collette-travel/hello-world-fixture
- control: button:spec/draft-mppu5bpd
- control: button:Ready · Atlassian Run 11
- control: button:default
- control: button:Settings
- control: heading:Specify
- control: button:Begin Specify
- control: button:Copilot connected⌄

Proposed shipped-component fixes:
- Replace shipped repo dropdown with design menu contents and row metadata.
- Keep titlebar chip accessible names aligned with design while menu is open.
- Match dropdown surface color/shadow/radius and add brand-orb marker.

## workspace-titlebar-gear-menu-open: FAIL

Pixel residual: 3.19%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/concierge-api'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'main'
- [elements] missing text: expected 'Report a bug'
- [elements] missing text: expected 'Export activity log'
- [elements] missing text: expected '14 lines'
- [elements] wrong control count: expected button 'Customize' x1, got 0
- [elements] wrong control count: expected button 'Report a bug' x1, got 0
- [elements] wrong control count: expected button 'Export activity log14 lines' x1, got 0
- [elements] wrong control count: expected button 'About' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [elements] missing visual marker: expected 'gear-menu-icons' at [data-vd-role="gear-menu-icons"]
- [styles] missing style sample: gear menu panel
- [styles] style drift on gear menu row.height: expected '32px', got '35.5px'
- [styles] style drift on gear menu row.gap: expected '10px', got '8px'
- [styles] style drift on gear menu row.padding: expected '9px 12px', got '8px 10px'

Extra shipped items observed:
- text: Concierge
- text: collette-travel/hello-world-fixture
- text: spec/draft-mppu5d2y
- text: Ready · Atlassian Run 11
- text: Settings
- text: Request access
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review
- text: Step 1
- text: Specify
- text: Begin Specify
- text: Copilot connected⌄
- text: Copilot connected
- text: ⌄
- text: 0.1.0
- text: test-acp-adapter 0.0.0:test-model
- control: button:collette-travel/hello-world-fixture
- control: button:spec/draft-mppu5d2y
- control: button:Ready · Atlassian Run 11
- control: button:default
- control: button:Settings
- control: heading:Specify
- control: button:Begin Specify
- control: button:Copilot connected⌄

Proposed shipped-component fixes:
- Rename Request access to Report a bug for this design state and add Export activity log with line-count sublabel.
- Use the design gear-menu row icons and data-vd marker.
- Match gear menu panel and row spacing/chrome.

## stepper-specify-current: FAIL

Pixel residual: 10.88%

Missing/wrong items:
- [elements] missing text: expected 'Specify'
- [elements] missing text: expected 'Clarify'
- [elements] missing text: expected 'Plan'
- [elements] missing text: expected 'Tasks'
- [elements] missing text: expected 'Analyze'
- [elements] missing text: expected 'Review'
- [elements] wrong control count: expected button 'Specify' x1, got 0
- [elements] wrong control count: expected button 'Clarify' x1, got 0
- [elements] wrong control count: expected button 'Plan' x1, got 0
- [elements] wrong control count: expected button 'Tasks' x1, got 0
- [elements] wrong control count: expected button 'Analyze' x1, got 0
- [elements] wrong control count: expected button 'Review' x1, got 0
- [elements] missing visual marker: expected 'stepper-track' at [data-vd-role="stepper-track"]
- [elements] missing visual marker: expected 'stepper-track-fill' at [data-vd-role="stepper-track-fill"]
- [elements] missing visual marker: expected 'step-orb' at [data-vd-role="step-orb"]
- [elements] missing visual marker: expected 'step-separator' at [data-vd-role="step-separator"]
- [styles] style drift on stepper current orb.width: expected '14px', got '206px'
- [styles] style drift on stepper current orb.height: expected '14px', got '36.5px'
- [styles] style drift on stepper current orb.border-radius: expected '50%', got '0px'
- [styles] style drift on stepper current orb.background-color: expected 'oklch(0.82 0.18 90)', got 'rgba(0, 0, 0, 0)'
- [styles] style drift on stepper tab label.font-weight: expected '500', got '400'
- [styles] style drift on stepper tab label.padding: expected '12px 18px 16px', got '0px 12px'
- [styles] style drift on stepper tab label.color: expected 'oklch(0.94 0.005 80)', got 'rgb(129, 145, 152)'
- [pixels] cropped pixel residual 10.88% exceeds 7%

Extra shipped items observed:
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review

Proposed shipped-component fixes:
- Replace shipped stepper tabs/status text with clean design labels only: Specify, Clarify, Plan, Tasks, Analyze, Review.
- Add small subtle step orbs plus connector/separator line and track-fill markers.
- Remove visible PENDING/NOT_AVAILABLE status labels and restyle selected/current state to design orb dimensions/color.

## stepper-clarify-current: FAIL

Pixel residual: 10.74%

Missing/wrong items:
- [elements] missing text: expected 'Specify'
- [elements] missing text: expected 'Clarify'
- [elements] missing text: expected 'Plan'
- [elements] missing text: expected 'Tasks'
- [elements] missing text: expected 'Analyze'
- [elements] missing text: expected 'Review'
- [elements] wrong control count: expected button 'Specify' x1, got 0
- [elements] wrong control count: expected button 'Clarify' x1, got 0
- [elements] wrong control count: expected button 'Plan' x1, got 0
- [elements] wrong control count: expected button 'Tasks' x1, got 0
- [elements] wrong control count: expected button 'Analyze' x1, got 0
- [elements] wrong control count: expected button 'Review' x1, got 0
- [elements] missing visual marker: expected 'stepper-track' at [data-vd-role="stepper-track"]
- [elements] missing visual marker: expected 'stepper-track-fill' at [data-vd-role="stepper-track-fill"]
- [elements] missing visual marker: expected 'step-orb' at [data-vd-role="step-orb"]
- [elements] missing visual marker: expected 'step-separator' at [data-vd-role="step-separator"]
- [styles] style drift on stepper current orb.width: expected '14px', got '206px'
- [styles] style drift on stepper current orb.height: expected '14px', got '36.5px'
- [styles] style drift on stepper current orb.border-radius: expected '50%', got '0px'
- [styles] style drift on stepper current orb.background-color: expected 'oklch(0.82 0.18 90)', got 'rgba(0, 0, 0, 0)'
- [styles] style drift on stepper tab label.font-weight: expected '500', got '400'
- [styles] style drift on stepper tab label.padding: expected '12px 18px 16px', got '0px 12px'
- [styles] style drift on stepper tab label.color: expected 'oklch(0.94 0.005 80)', got 'rgb(129, 145, 152)'
- [pixels] cropped pixel residual 10.74% exceeds 7%

Extra shipped items observed:
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review

Proposed shipped-component fixes:
- Replace shipped stepper tabs/status text with clean design labels only: Specify, Clarify, Plan, Tasks, Analyze, Review.
- Add small subtle step orbs plus connector/separator line and track-fill markers.
- Remove visible PENDING/NOT_AVAILABLE status labels and restyle selected/current state to design orb dimensions/color.

## stepper-plan-current: FAIL

Pixel residual: 10.73%

Missing/wrong items:
- [elements] missing text: expected 'Specify'
- [elements] missing text: expected 'Clarify'
- [elements] missing text: expected 'Plan'
- [elements] missing text: expected 'Tasks'
- [elements] missing text: expected 'Analyze'
- [elements] missing text: expected 'Review'
- [elements] wrong control count: expected button 'Specify' x1, got 0
- [elements] wrong control count: expected button 'Clarify' x1, got 0
- [elements] wrong control count: expected button 'Plan' x1, got 0
- [elements] wrong control count: expected button 'Tasks' x1, got 0
- [elements] wrong control count: expected button 'Analyze' x1, got 0
- [elements] wrong control count: expected button 'Review' x1, got 0
- [elements] missing visual marker: expected 'stepper-track' at [data-vd-role="stepper-track"]
- [elements] missing visual marker: expected 'stepper-track-fill' at [data-vd-role="stepper-track-fill"]
- [elements] missing visual marker: expected 'step-orb' at [data-vd-role="step-orb"]
- [elements] missing visual marker: expected 'step-separator' at [data-vd-role="step-separator"]
- [styles] style drift on stepper current orb.width: expected '14px', got '206px'
- [styles] style drift on stepper current orb.height: expected '14px', got '36.5px'
- [styles] style drift on stepper current orb.border-radius: expected '50%', got '0px'
- [styles] style drift on stepper current orb.background-color: expected 'oklch(0.82 0.18 90)', got 'rgba(0, 0, 0, 0)'
- [styles] style drift on stepper tab label.font-weight: expected '500', got '400'
- [styles] style drift on stepper tab label.padding: expected '12px 18px 16px', got '0px 12px'
- [styles] style drift on stepper tab label.color: expected 'oklch(0.94 0.005 80)', got 'rgb(129, 145, 152)'
- [pixels] cropped pixel residual 10.73% exceeds 7%

Extra shipped items observed:
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review

Proposed shipped-component fixes:
- Replace shipped stepper tabs/status text with clean design labels only: Specify, Clarify, Plan, Tasks, Analyze, Review.
- Add small subtle step orbs plus connector/separator line and track-fill markers.
- Remove visible PENDING/NOT_AVAILABLE status labels and restyle selected/current state to design orb dimensions/color.

## stepper-tasks-current: FAIL

Pixel residual: 10.74%

Missing/wrong items:
- [elements] missing text: expected 'Specify'
- [elements] missing text: expected 'Clarify'
- [elements] missing text: expected 'Plan'
- [elements] missing text: expected 'Tasks'
- [elements] missing text: expected 'Analyze'
- [elements] missing text: expected 'Review'
- [elements] wrong control count: expected button 'Specify' x1, got 0
- [elements] wrong control count: expected button 'Clarify' x1, got 0
- [elements] wrong control count: expected button 'Plan' x1, got 0
- [elements] wrong control count: expected button 'Tasks' x1, got 0
- [elements] wrong control count: expected button 'Analyze' x1, got 0
- [elements] wrong control count: expected button 'Review' x1, got 0
- [elements] missing visual marker: expected 'stepper-track' at [data-vd-role="stepper-track"]
- [elements] missing visual marker: expected 'stepper-track-fill' at [data-vd-role="stepper-track-fill"]
- [elements] missing visual marker: expected 'step-orb' at [data-vd-role="step-orb"]
- [elements] missing visual marker: expected 'step-separator' at [data-vd-role="step-separator"]
- [styles] style drift on stepper current orb.width: expected '14px', got '206px'
- [styles] style drift on stepper current orb.height: expected '14px', got '36.5px'
- [styles] style drift on stepper current orb.border-radius: expected '50%', got '0px'
- [styles] style drift on stepper current orb.background-color: expected 'oklch(0.82 0.18 90)', got 'rgba(0, 0, 0, 0)'
- [styles] style drift on stepper tab label.font-weight: expected '500', got '400'
- [styles] style drift on stepper tab label.padding: expected '12px 18px 16px', got '0px 12px'
- [styles] style drift on stepper tab label.color: expected 'oklch(0.94 0.005 80)', got 'rgb(129, 145, 152)'
- [pixels] cropped pixel residual 10.74% exceeds 7%

Extra shipped items observed:
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review

Proposed shipped-component fixes:
- Replace shipped stepper tabs/status text with clean design labels only: Specify, Clarify, Plan, Tasks, Analyze, Review.
- Add small subtle step orbs plus connector/separator line and track-fill markers.
- Remove visible PENDING/NOT_AVAILABLE status labels and restyle selected/current state to design orb dimensions/color.

## stepper-analyze-current: FAIL

Pixel residual: 10.74%

Missing/wrong items:
- [elements] missing text: expected 'Specify'
- [elements] missing text: expected 'Clarify'
- [elements] missing text: expected 'Plan'
- [elements] missing text: expected 'Tasks'
- [elements] missing text: expected 'Analyze'
- [elements] missing text: expected 'Review'
- [elements] wrong control count: expected button 'Specify' x1, got 0
- [elements] wrong control count: expected button 'Clarify' x1, got 0
- [elements] wrong control count: expected button 'Plan' x1, got 0
- [elements] wrong control count: expected button 'Tasks' x1, got 0
- [elements] wrong control count: expected button 'Analyze' x1, got 0
- [elements] wrong control count: expected button 'Review' x1, got 0
- [elements] missing visual marker: expected 'stepper-track' at [data-vd-role="stepper-track"]
- [elements] missing visual marker: expected 'stepper-track-fill' at [data-vd-role="stepper-track-fill"]
- [elements] missing visual marker: expected 'step-orb' at [data-vd-role="step-orb"]
- [elements] missing visual marker: expected 'step-separator' at [data-vd-role="step-separator"]
- [styles] style drift on stepper current orb.width: expected '14px', got '206px'
- [styles] style drift on stepper current orb.height: expected '14px', got '36.5px'
- [styles] style drift on stepper current orb.border-radius: expected '50%', got '0px'
- [styles] style drift on stepper current orb.background-color: expected 'oklch(0.82 0.18 90)', got 'rgba(0, 0, 0, 0)'
- [styles] style drift on stepper tab label.font-weight: expected '500', got '400'
- [styles] style drift on stepper tab label.padding: expected '12px 18px 16px', got '0px 12px'
- [styles] style drift on stepper tab label.color: expected 'oklch(0.94 0.005 80)', got 'rgb(129, 145, 152)'
- [pixels] cropped pixel residual 10.74% exceeds 7%

Extra shipped items observed:
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review

Proposed shipped-component fixes:
- Replace shipped stepper tabs/status text with clean design labels only: Specify, Clarify, Plan, Tasks, Analyze, Review.
- Add small subtle step orbs plus connector/separator line and track-fill markers.
- Remove visible PENDING/NOT_AVAILABLE status labels and restyle selected/current state to design orb dimensions/color.

## stepper-review-current: FAIL

Pixel residual: 10.74%

Missing/wrong items:
- [elements] missing text: expected 'Specify'
- [elements] missing text: expected 'Clarify'
- [elements] missing text: expected 'Plan'
- [elements] missing text: expected 'Tasks'
- [elements] missing text: expected 'Analyze'
- [elements] missing text: expected 'Review'
- [elements] wrong control count: expected button 'Specify' x1, got 0
- [elements] wrong control count: expected button 'Clarify' x1, got 0
- [elements] wrong control count: expected button 'Plan' x1, got 0
- [elements] wrong control count: expected button 'Tasks' x1, got 0
- [elements] wrong control count: expected button 'Analyze' x1, got 0
- [elements] wrong control count: expected button 'Review' x1, got 0
- [elements] missing visual marker: expected 'stepper-track' at [data-vd-role="stepper-track"]
- [elements] missing visual marker: expected 'stepper-track-fill' at [data-vd-role="stepper-track-fill"]
- [elements] missing visual marker: expected 'step-orb' at [data-vd-role="step-orb"]
- [elements] missing visual marker: expected 'step-separator' at [data-vd-role="step-separator"]
- [styles] style drift on stepper current orb.width: expected '14px', got '206px'
- [styles] style drift on stepper current orb.height: expected '14px', got '36.5px'
- [styles] style drift on stepper current orb.border-radius: expected '50%', got '0px'
- [styles] style drift on stepper current orb.background-color: expected 'oklch(0.82 0.18 90)', got 'rgba(0, 0, 0, 0)'
- [styles] style drift on stepper tab label.font-weight: expected '500', got '400'
- [styles] style drift on stepper tab label.padding: expected '12px 18px 16px', got '0px 12px'
- [styles] style drift on stepper tab label.color: expected 'oklch(0.94 0.005 80)', got 'rgb(129, 145, 152)'
- [pixels] cropped pixel residual 10.74% exceeds 7%

Extra shipped items observed:
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review

Proposed shipped-component fixes:
- Replace shipped stepper tabs/status text with clean design labels only: Specify, Clarify, Plan, Tasks, Analyze, Review.
- Add small subtle step orbs plus connector/separator line and track-fill markers.
- Remove visible PENDING/NOT_AVAILABLE status labels and restyle selected/current state to design orb dimensions/color.

## specify-input: FAIL

Pixel residual: 3.23%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/concierge-api'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'main'
- [elements] missing text: expected 'Add a self-serve flight-change flow so loyalty-tier guests can rebook within ±48h of departure without calling the concierge desk. Must respect existing rebook'
- [elements] missing text: expected 'Clear'
- [elements] missing text: expected 'Begin specify'
- [elements] wrong control count: expected button 'a.kim' x1, got 0
- [elements] wrong control count: expected button 'collette-travel/concierge-api' x1, got 0
- [elements] wrong control count: expected button 'main' x1, got 0
- [elements] wrong control count: expected button 'Claude Sonnet 4.5default' x1, got 0
- [elements] wrong control count: expected button 'Clear' x1, got 0
- [elements] wrong control count: expected button 'Begin specify' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [elements] missing visual marker: expected 'begin-sparkle' at [data-vd-role="begin-sparkle"]
- [styles] missing style sample: specify prompt input
- [styles] missing style sample: begin specify button

Extra shipped items observed:
- text: Concierge
- text: collette-travel/hello-world-fixture
- text: spec/draft-mppu5mx0
- text: Ready · Atlassian Run 11
- text: Settings
- text: specifypending
- text: specify
- text: pending
- text: clarifynot_available
- text: clarify
- text: not_available
- text: plannot_available
- text: plan
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review
- text: Step 1
- text: Specify
- text: Begin Specify
- text: Copilot connected⌄
- text: Copilot connected
- text: ⌄
- text: 0.1.0
- text: test-acp-adapter 0.0.0:test-model
- control: button:collette-travel/hello-world-fixture
- control: button:spec/draft-mppu5mx0
- control: button:Ready · Atlassian Run 11
- control: button:default
- control: button:Settings
- control: heading:Specify
- control: button:Begin Specify
- control: button:Copilot connected⌄

Proposed shipped-component fixes:
- Remove STEP 1 eyebrow and Specify h2 chrome; make the prompt textarea the section.
- Add Clear on the left and move Begin specify to bottom-right with sparkle icon and exact casing.
- Soften prompt input border/card chrome and align titlebar markers/chips.

## specify-running: FAIL

Pixel residual: 3.35%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/concierge-api'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'spec/draft-rpg3'
- [elements] missing text: expected 'Specifying…'
- [elements] missing text: expected 'Watch progress in the activity stream.'
- [elements] wrong control count: expected button 'a.kim' x1, got 0
- [elements] wrong control count: expected button 'collette-travel/concierge-api' x1, got 0
- [elements] wrong control count: expected button 'spec/draft-rpg3' x1, got 0
- [elements] wrong control count: expected button 'Claude Sonnet 4.5default' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [styles] missing style sample: spec loading panel

Extra shipped items observed:
- text: Concierge
- text: collette-travel/hello-world-fixture
- text: spec/draft-mppu5o7b
- text: Ready · Atlassian Run 11
- text: Settings
- text: specifycomplete
- text: specify
- text: complete
- text: clarifypending
- text: clarify
- text: pending
- text: plannot_available
- text: plan
- text: not_available
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review
- text: Step 1
- text: Specify
- text: Preview
- text: Edit
- text: Pop out
- text: Review 0% read.
- text: Hello-world feature
- text: Prompt: Create or update spec.md for this Spec Kit feature request. Keep the generated specification concise and valid markdown.
- text: Build a hello-world feature
- text: This specification was generated by the Run 6 Specify adapter.
- text: Continue
- text: Scroll review gate is enabled.
- text: Specify complete⌄
- text: Specify complete
- text: ⌄
- text: 0.1.0
- text: test-acp-adapter 0.0.0:test-model
- control: button:collette-travel/hello-world-fixture
- control: button:spec/draft-mppu5o7b
- control: button:Ready · Atlassian Run 11
- control: button:default
- control: button:Settings
- control: heading:Specify
- control: button:Preview
- control: button:Edit
- control: button:Pop out
- control: heading:Hello-world feature
- control: button:Continue
- control: button:Specify complete⌄

Proposed shipped-component fixes:
- Render the design running state: Specifying..., spec.md label, spinner, and activity-stream helper copy.
- Use the design branch chip value spec/draft-rpg3 in the captured state.
- Add spinner/brand markers and loading panel chrome.

## specify-complete: FAIL

Pixel residual: 3.89%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'collette-travel/concierge-api'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'Claude Sonnet 4.5'
- [elements] missing text: expected 'spec/draft-rr6q'
- [elements] missing text: expected 'spec.md · 63 lines'
- [elements] missing text: expected 'Self-serve flight-change for loyalty guests'
- [elements] missing text: expected 'Problem'
- [elements] missing text: expected 'Goals'
- [elements] missing text: expected 'Non-goals'
- [elements] missing text: expected 'User stories'
- [elements] missing text: expected 'Acceptance criteria'
- [elements] missing text: expected 'Dependencies'
- [elements] missing text: expected 'Out of scope clarifications needed'
- [elements] missing text: expected 'Open risks'
- [elements] missing text: expected 'Notes'
- [elements] missing text: expected 'Scroll to the end of the spec to unlock the Clarify step.'
- [elements] missing text: expected 'Jump to end'
- [elements] missing text: expected 'Clarify'
- [elements] wrong heading level 1: expected 'Self-serve flight-change for loyalty guests', got 'Specify'
- [elements] missing heading level 2: expected 'Problem'
- [elements] missing heading level 2: expected 'Goals'
- [elements] missing heading level 2: expected 'Non-goals'
- [elements] missing heading level 2: expected 'User stories'
- [elements] missing heading level 2: expected 'Acceptance criteria'
- [elements] missing heading level 2: expected 'Dependencies'
- [elements] missing heading level 2: expected 'Out of scope clarifications needed'
- [elements] missing heading level 2: expected 'Open risks'
- [elements] missing heading level 2: expected 'Notes'
- [elements] wrong control count: expected button 'Jump to end' x1, got 0
- [elements] wrong control count: expected button 'Clarify' x1, got 0
- [elements] missing visual marker: expected 'brand-orb' at [data-vd-role="brand-orb"]
- [styles] missing style sample: markdown panel

Extra shipped items observed:
- text: Concierge
- text: collette-travel/hello-world-fixture
- text: spec/draft-mppu5pjp
- text: Ready · Atlassian Run 11
- text: Settings
- text: specifycomplete
- text: specify
- text: complete
- text: clarifypending
- text: clarify
- text: pending
- text: plannot_available
- text: plan
- text: not_available
- text: tasksnot_available
- text: tasks
- text: analyzenot_available
- text: analyze
- text: reviewnot_available
- text: review
- text: Step 1
- text: Specify
- text: Pop out
- text: Review 0% read.
- text: Hello-world feature
- text: Prompt: Create or update spec.md for this Spec Kit feature request. Keep the generated specification concise and valid markdown.
- text: Build a hello-world feature
- text: This specification was generated by the Run 6 Specify adapter.
- text: Continue
- text: Scroll review gate is enabled.
- text: Specify complete⌄
- text: Specify complete
- text: ⌄
- text: 0.1.0
- text: test-acp-adapter 0.0.0:test-model
- control: button:collette-travel/hello-world-fixture
- control: button:spec/draft-mppu5pjp
- control: button:Ready · Atlassian Run 11
- control: button:default
- control: button:Settings
- control: heading:Specify
- control: button:Pop out
- control: heading:Hello-world feature
- control: button:Continue
- control: button:Specify complete⌄

Proposed shipped-component fixes:
- Render the design markdown preview with design headings and unlock footer controls.
- Replace shipped Specify fallback state in this capture with the completed spec.md state.
- Add brand marker and markdown panel styling.

## activity-rail-idle: FAIL

Pixel residual: 5.3%

Missing/wrong items:
- [elements] missing text: expected 'Activity'
- [elements] missing text: expected 'idle'
- [elements] missing text: expected 'Current'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected '00:00:00'
- [elements] missing text: expected 'Concierge ready. Awaiting workspace.'
- [elements] missing text: expected 'gh auth login'
- [elements] missing text: expected 'Opening browser for device code…'
- [elements] missing text: expected 'gh copilot auth'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'atlassian mcp'
- [elements] missing text: expected 'collette-travel.atlassian.net'
- [elements] missing text: expected 'gpt-5-codex'
- [elements] missing text: expected 'git checkout'
- [elements] missing text: expected 'main'
- [elements] missing text: expected 'cd'
- [elements] missing text: expected 'git pull'
- [elements] missing text: expected 'Fetching collette-travel org repos…'
- [elements] missing text: expected '14'
- [elements] missing text: expected 'auto-scroll'
- [elements] missing text: expected 'Clear'
- [elements] wrong control count: expected button 'Clear' x1, got 0
- [elements] missing visual marker: expected 'activity-idle-dot' at [data-vd-role="activity-idle-dot"]
- [elements] missing visual marker: expected 'activity-pulse-dot' at [data-vd-role="activity-pulse-dot"]
- [styles] style drift on activity rail panel.background-color: expected 'oklch(0.165 0.003 280)', got 'rgba(8, 13, 16, 0.96)'
- [styles] style drift on activity rail panel.border-radius: expected '0px', got '10px'
- [styles] style drift on activity rail panel.border-top-color: expected 'oklch(0.94 0.005 80)', got 'rgb(60, 77, 85)'
- [styles] style drift on activity rail panel.box-shadow: expected 'none', got 'rgba(0, 0, 0, 0.78) 0px 30px 80px -24px, rgb(60, 77, 85) 0px 0px 0px 1px'

Extra shipped items observed:
- text: Idle - Copilot connected

Proposed shipped-component fixes:
- Replace sparse shipped activity rail with design header, idle status, current block, history rows, footer counters, auto-scroll, and Clear control.
- Use square/right rail treatment from design rather than floating rounded panel.
- Add idle-dot and pulse-dot markers.

## activity-rail-busy: FAIL

Pixel residual: 5.77%

Missing/wrong items:
- [elements] missing text: expected 'Activity'
- [elements] missing text: expected 'running'
- [elements] missing text: expected 'Current'
- [elements] missing text: expected 'spec.md'
- [elements] missing text: expected '00:00:00'
- [elements] missing text: expected 'Concierge ready. Awaiting workspace.'
- [elements] missing text: expected 'gh auth login'
- [elements] missing text: expected 'Opening browser for device code…'
- [elements] missing text: expected 'gh copilot auth'
- [elements] missing text: expected 'a.kim'
- [elements] missing text: expected 'atlassian mcp'
- [elements] missing text: expected 'collette-travel.atlassian.net'
- [elements] missing text: expected 'gpt-5-codex'
- [elements] missing text: expected 'git checkout'
- [elements] missing text: expected 'main'
- [elements] missing text: expected 'cd'
- [elements] missing text: expected 'git pull'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'git checkout -b'
- [elements] missing text: expected 'spec/draft-rwgq'
- [elements] missing text: expected 'copilot'
- [elements] missing text: expected 'Fetching collette-travel org repos…'
- [elements] missing text: expected '16 lines'
- [elements] missing text: expected 'auto-scroll'
- [elements] missing text: expected 'Clear'
- [elements] wrong control count: expected button 'Clear' x1, got 0
- [elements] missing visual marker: expected 'spinner' at [data-vd-role="spinner"]
- [styles] missing style sample: activity busy status

Extra shipped items observed:
- text: Idle - Specify complete

Proposed shipped-component fixes:
- Render running status, current spec.md, busy spinner, expanded command history, line count, auto-scroll, and Clear.
- Add spinner marker and match busy status chip styling.

## activity-pill-idle: FAIL

Pixel residual: 19.05%

Missing/wrong items:
- [elements] missing text: expected 'Idle'
- [elements] wrong control count: expected button 'Idle' x1, got 0
- [elements] missing visual marker: expected 'activity-terminal-icon' at [data-vd-role="activity-terminal-icon"]
- [elements] missing visual marker: expected 'activity-pill-divider' at [data-vd-role="activity-pill-divider"]
- [styles] style drift on activity pill.background-color: expected 'oklch(0.2 0.005 280)', got 'rgb(17, 23, 27)'
- [styles] style drift on activity pill.border-top-color: expected 'oklch(0.285 0.006 280)', got 'rgb(60, 77, 85)'
- [styles] style drift on activity pill.padding: expected '0px', got '0px 14px 0px 10px'
- [pixels] cropped pixel residual 19.05% exceeds 7%

Extra shipped items observed:
- text: Copilot connected⌄
- text: Copilot connected
- text: ⌄
- control: button:Copilot connected⌄

Proposed shipped-component fixes:
- Make collapsed activity pill icon-only: terminal icon, divider, always-visible PixelC spinner, no text label/chevron.
- Add vd markers for terminal icon, divider, and spinner.
- Match compact pill padding, border, and residual size.

## activity-pill-busy: FAIL

Pixel residual: 20.36%

Missing/wrong items:
- [elements] missing text: expected 'Build a hello-world feature'
- [elements] wrong control count: expected button 'Build a hello-world feature' x1, got 0
- [elements] missing visual marker: expected 'activity-terminal-icon' at [data-vd-role="activity-terminal-icon"]
- [elements] missing visual marker: expected 'activity-pill-divider' at [data-vd-role="activity-pill-divider"]
- [styles] style drift on activity pill busy.background-color: expected 'oklch(0.2 0.005 280)', got 'rgb(17, 23, 27)'
- [styles] style drift on activity pill busy.border-top-color: expected 'rgb(19, 47, 59)', got 'rgb(60, 77, 85)'
- [styles] style drift on activity pill busy.padding: expected '0px', got '0px 14px 0px 10px'
- [pixels] cropped pixel residual 20.36% exceeds 7%

Extra shipped items observed:
- text: Specify complete⌄
- text: Specify complete
- text: ⌄
- control: button:Specify complete⌄

Proposed shipped-component fixes:
- Keep the collapsed activity pill icon-only while busy; spinner motion/chrome changes, not text.
- Remove currentStatus text from the pill and add terminal/divider/spinner markers.
- Match busy border/color treatment.

## customize-modal: FAIL

Pixel residual: 16.51%

Missing/wrong items:
- [elements] missing text: expected 'Theme'
- [elements] missing text: expected 'Compact'
- [elements] missing text: expected 'Regular'
- [elements] missing text: expected 'Comfy'
- [elements] missing text: expected 'Layout'
- [elements] missing text: expected 'Activity stream'
- [elements] missing text: expected 'Left'
- [elements] missing text: expected 'Right'
- [elements] missing text: expected 'Off'
- [elements] missing text: expected 'Flow'
- [elements] missing text: expected 'Require scroll to unlock Clarify'
- [elements] missing heading level 2: expected 'Customize'
- [elements] wrong control count: expected button 'Compact' x1, got 0
- [elements] wrong control count: expected button 'Regular' x1, got 0
- [elements] wrong control count: expected button 'Comfy' x1, got 0
- [elements] wrong control count: expected button 'Left' x1, got 0
- [elements] wrong control count: expected button 'Right' x1, got 0
- [elements] wrong control count: expected button 'Off' x1, got 0
- [elements] missing visual marker: expected 'modal-veil' at [data-vd-role="modal-veil"]
- [styles] style drift on customize modal panel.background-color: expected 'oklch(0.165 0.003 280)', got 'rgb(17, 23, 27)'
- [styles] style drift on customize modal panel.border-radius: expected '10px', got '14px'
- [styles] style drift on customize modal panel.box-shadow: expected 'oklch(0 0 0 / 0.7) 0px 24px 48px -16px, oklch(0.285 0.006 280) 0px 0px 0px 1px', got 'rgba(0, 0, 0, 0.78) 0px 30px 80px -24px, rgb(60, 77, 85) 0px 0px 0px 1px'
- [styles] style drift on customize modal panel.padding: expected '0px', got '18px'
- [styles] missing style sample: customize segmented control
- [pixels] cropped pixel residual 16.51% exceeds 7%

Extra shipped items observed:
- text: comfortable
- text: compact
- text: Activity side
- text: right
- text: hidden
- text: Require scroll to unlock
- text: Close
- control: button:comfortable
- control: button:compact
- control: button:right
- control: button:hidden
- control: button:Close

Proposed shipped-component fixes:
- Replace shipped modal with design sections: Theme, Accent, Density, Layout, Flow, segmented controls, and scroll-unlock switch.
- Add modal veil vd marker and align panel radius/shadow/padding.
- Use design segmented-control labels and casing.

## about-modal: FAIL

Pixel residual: 12.13%

Missing/wrong items:
- [elements] missing text: expected 'Spec-kit Concierge'
- [elements] missing text: expected 'An Electron wrapper around GitHub Copilot CLI driving the spec-kit workflow, tuned for the Collette-travel concierge team.'
- [elements] missing text: expected '2.0.0 (2026.05.20)'
- [elements] missing text: expected 'Org'
- [elements] missing text: expected 'collette-travel'
- [elements] missing text: expected 'Repo'
- [elements] missing text: expected 'concierge-api'
- [elements] missing text: expected 'Branch'
- [elements] missing text: expected '—'
- [elements] missing text: expected 'Copilot model'
- [elements] missing text: expected 'claude-sonnet-4-5'
- [elements] missing text: expected 'spec-kit'
- [elements] missing text: expected 'v0.9.4'
- [elements] missing text: expected 'Concierge team'
- [elements] missing text: expected '#concierge-triage'
- [elements] missing text: expected 'Documentation'
- [elements] missing heading level 2: expected 'Spec-kit Concierge'
- [elements] wrong control count: expected button 'Documentation' x1, got 0
- [elements] missing visual marker: expected 'modal-veil' at [data-vd-role="modal-veil"]
- [styles] style drift on about modal panel.background-color: expected 'oklch(0.165 0.003 280)', got 'rgb(17, 23, 27)'
- [styles] style drift on about modal panel.border-radius: expected '10px', got '14px'
- [styles] style drift on about modal panel.box-shadow: expected 'oklch(0 0 0 / 0.7) 0px 24px 48px -16px, oklch(0.285 0.006 280) 0px 0px 0px 1px', got 'rgba(0, 0, 0, 0.78) 0px 30px 80px -24px, rgb(60, 77, 85) 0px 0px 0px 1px'
- [styles] style drift on about modal panel.padding: expected '0px', got '18px'
- [pixels] cropped pixel residual 12.13% exceeds 7%

Extra shipped items observed:
- text: About Concierge
- text: hello-world-fixture on spec/draft-mppu5xwk
- text: Version 0.1.0 · 6c0622e
- text: License: Internal
- control: heading:About Concierge

Proposed shipped-component fixes:
- Render design About content: version, org/repo/branch/model/spec-kit/team rows, Documentation, Close.
- Add modal veil marker and align modal panel chrome.
- Use design heading level and copy.

## request-modal: FAIL

Pixel residual: 10.63%

Missing/wrong items:
- [elements] missing text: expected 'Report a bug or request a feature'
- [elements] missing text: expected 'Request type'
- [elements] missing text: expected 'Feature'
- [elements] missing text: expected 'Bug'
- [elements] missing text: expected 'Title'
- [elements] missing text: expected 'Details'
- [elements] missing text: expected 'Severity'
- [elements] missing text: expected 'Low'
- [elements] missing text: expected 'Normal'
- [elements] missing text: expected 'High'
- [elements] missing text: expected 'Blocker'
- [elements] missing text: expected 'Attach context (auto)'
- [elements] missing text: expected '#concierge-triage'
- [elements] missing text: expected 'Cancel'
- [elements] missing text: expected 'Send request'
- [elements] missing heading level 2: expected 'Report a bug or request a feature'
- [elements] wrong control count: expected button 'Feature' x1, got 0
- [elements] wrong control count: expected button 'Bug' x1, got 0
- [elements] wrong control count: expected button 'Low' x1, got 0
- [elements] wrong control count: expected button 'Normal' x1, got 0
- [elements] wrong control count: expected button 'High' x1, got 0
- [elements] wrong control count: expected button 'Blocker' x1, got 0
- [elements] wrong control count: expected button 'Cancel' x1, got 0
- [elements] wrong control count: expected button 'Send request' x1, got 0
- [elements] missing visual marker: expected 'modal-veil' at [data-vd-role="modal-veil"]
- [styles] style drift on request modal panel.background-color: expected 'oklch(0.165 0.003 280)', got 'rgb(17, 23, 27)'
- [styles] style drift on request modal panel.border-radius: expected '10px', got '14px'
- [styles] style drift on request modal panel.box-shadow: expected 'oklch(0 0 0 / 0.7) 0px 24px 48px -16px, oklch(0.285 0.006 280) 0px 0px 0px 1px', got 'rgba(0, 0, 0, 0.78) 0px 30px 80px -24px, rgb(60, 77, 85) 0px 0px 0px 1px'
- [styles] style drift on request modal panel.padding: expected '0px', got '18px'
- [styles] missing style sample: request primary action
- [pixels] cropped pixel residual 10.63% exceeds 7%

Extra shipped items observed:
- text: Request support
- text: Request capture is scheduled for Run 12.
- text: Stub only for Run 6.5 visual verification.
- text: Close
- control: heading:Request support
- control: button:Close

Proposed shipped-component fixes:
- Replace Request access flow with design Report a bug or request a feature modal.
- Add Feature/Bug type controls, title/details fields, severity buttons, context tag, Cancel and Send request.
- Add modal veil marker and match panel/primary action styling.

## signin-fresh: PASS

Pixel residual: 6.25%

Missing/wrong items: none.

Extra shipped items observed:
- None detected by DOM/AOM snapshot.

Proposed shipped-component fixes:
- Keep current shipped component behavior; no component fix proposed because this screen passed the real contract.

## signin-github-ok: PASS

Pixel residual: 5.97%

Missing/wrong items: none.

Extra shipped items observed:
- None detected by DOM/AOM snapshot.

Proposed shipped-component fixes:
- Keep current shipped component behavior; no component fix proposed because this screen passed the real contract.

