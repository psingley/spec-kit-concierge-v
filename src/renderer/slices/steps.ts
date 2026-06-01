import { createAction, createEntityAdapter, createSlice, type EntityState, type PayloadAction } from '@reduxjs/toolkit';

export type StepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
export type StepState = 'not_available' | 'pending' | 'complete';
export type TrailerStatus = 'pending' | 'pass' | 'fail' | 'skipped';

export type StepStateRecord = {
  id: StepName;
  status: StepState;
  commitSha?: string;
  sessionId?: string;
  trailer?: string;
  resetReason?: string;
  warnings: string[];
};

export type TrailerStepRecord = {
  id: string;
  status: string;
  commitSha: string;
  trailer?: string;
  warnings?: string[];
};

export type ClarifyQuestionMalformedPayload = {
  questionId: string;
  malformationCategory: string;
  rawOutput: string;
  timestamp: string;
  modelId: string;
  sessionId: string;
};

export const stepNames = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'] as const;

// Intentional design deviation: the fetched prototype swaps Tasks and Analyze,
// but constitution v1.0.4 and ROADMAP_DECISIONS govern the shipped step order.
export const stepOrder: StepName[] = [...stepNames];

const isStepName = (value: string): value is StepName =>
  (stepNames as readonly string[]).includes(value);

const trailerStatusToStepState = (status: string): StepState => {
  switch (status) {
    case 'pass':
      return 'complete';
    case 'pending':
      return 'pending';
    case 'fail':
    case 'skipped':
    default:
      return 'not_available';
  }
};

export const stepsAdapter = createEntityAdapter<StepStateRecord, StepName>({
  selectId: (record) => record.id
});

export type StepsState = EntityState<StepStateRecord, StepName>;

export const stepsInitialState: StepsState = stepsAdapter.getInitialState();

const getExistingStatus = (state: StepsState, step: StepName): StepState =>
  state.entities[step]?.status ?? 'not_available';

const stepsSlice = createSlice({
  name: 'steps',
  initialState: stepsInitialState,
  reducers: {
    stepPending: (
      state,
      action: PayloadAction<{ step: StepName; sessionId: string; warnings?: string[] }>
    ) => {
      if (getExistingStatus(state, action.payload.step) === 'complete') {
        return;
      }

      stepsAdapter.upsertOne(state, {
        id: action.payload.step,
        status: 'pending',
        sessionId: action.payload.sessionId,
        warnings: action.payload.warnings ?? []
      });
    },
    stepCompleted: (
      state,
      action: PayloadAction<{ step: StepName; commitSha: string; trailer: string; warnings?: string[] }>
    ) => {
      if (getExistingStatus(state, action.payload.step) !== 'pending') {
        return;
      }

      stepsAdapter.upsertOne(state, {
        id: action.payload.step,
        status: 'complete',
        commitSha: action.payload.commitSha,
        trailer: action.payload.trailer,
        warnings: action.payload.warnings ?? []
      });
    },
    stepReset: (state, action: PayloadAction<{ step: StepName; reason: string }>) => {
      stepsAdapter.upsertOne(state, {
        id: action.payload.step,
        status: 'not_available',
        resetReason: action.payload.reason,
        warnings: []
      });
    },
    stepsRestoredFromSession: (state, action: PayloadAction<{ states: Record<StepName, StepState> }>) => {
      stepsAdapter.setAll(
        state,
        stepNames.map((step) => ({
          id: step,
          status: action.payload.states[step],
          warnings: []
        }))
      );
    },
    stepsRestored: (state, action: PayloadAction<{ records: TrailerStepRecord[] }>) => {
      const latestByStep = new Map<StepName, TrailerStepRecord>();

      for (const record of action.payload.records) {
        if (isStepName(record.id)) {
          latestByStep.set(record.id, record);
        }
      }

      stepsAdapter.setAll(
        state,
        Array.from(latestByStep.entries()).map(([step, record]) => ({
          id: step,
          status: trailerStatusToStepState(record.status),
          commitSha: record.commitSha,
          trailer: record.trailer ?? `Concierge-Step: ${step}:${record.status}`,
          warnings: record.warnings ?? []
        }))
      );
    }
  },
  extraReducers: () => {}
});

export const stepsRestorationRequested = createAction<{
  commits: Array<{ sha: string; message: string }>;
}>('steps/restorationRequested');

export const dirtyResumeDetected = createAction<{
  repositoryPath: string;
  sessionId: string;
  step: StepName;
  expectedArtifacts: string[];
}>('steps/dirtyResumeDetected');

export const hookFailed = createAction<{
  sessionId: string;
  step: StepName;
  reason: string;
}>('steps/hookFailed');

export const clarifyQuestionMalformed = createAction<ClarifyQuestionMalformedPayload>(
  'clarify/questionMalformed'
);

export const { stepPending, stepCompleted, stepReset, stepsRestored, stepsRestoredFromSession } = stepsSlice.actions;
export const stepsReducer = stepsSlice.reducer;
export default stepsReducer;
