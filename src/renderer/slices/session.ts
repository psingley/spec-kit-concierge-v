import { createEntityAdapter, createSlice, type EntityState, type PayloadAction } from '@reduxjs/toolkit';

export type ClarifyChoice = {
  key: string;
  label: string;
};

export type ClarifyQuestionRecord = {
  id: string;
  position: number;
  text: string;
  choices: ClarifyChoice[];
  malformed?: boolean;
  malformationCategory?: string;
  rawOutput?: string;
};

export type ClarifyAnswerRecord = {
  id: string;
  questionId: string;
  selectedChoiceKey: string;
  shortAnswer: string;
};

export type ClarifyReaskRecord = {
  id: string;
  questionId: string;
  attempts: number;
  inFlight: boolean;
  category: string;
};

export type ClarifyCompletionSummary = {
  artifactPath: string;
  commitSha: string;
  questions: Array<{ id: string; text: string; position: number }>;
  answers: Array<{ questionId: string; selectedChoiceKey: string; shortAnswer: string }>;
};

export type PassiveStepName = 'plan' | 'tasks' | 'analyze';

export type PassiveArtifactSummary = {
  path: string;
  kind: 'text' | 'markdown' | 'code' | 'image' | 'pdf';
  required: boolean;
  bytes?: number;
};

export type PassiveMilestoneSummary = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'warning';
};

export type PassiveStepRecord = {
  step: PassiveStepName;
  sessionId: string | null;
  running: boolean;
  commitSha: string | null;
  failureReason: string | null;
  artifacts: PassiveArtifactSummary[];
  milestones: PassiveMilestoneSummary[];
};

const clarifyQuestionsAdapter = createEntityAdapter<ClarifyQuestionRecord>();
const clarifyAnswersAdapter = createEntityAdapter<ClarifyAnswerRecord>();
const clarifyReasksAdapter = createEntityAdapter<ClarifyReaskRecord>();

export type SessionState = {
  activeSessionId: string | null;
  modelId: string | null;
  modeId: string | null;
  specifyPrompt: string;
  specifyRunning: boolean;
  specifyStarted: boolean;
  specMarkdown: string;
  artifactPath: string | null;
  commitSha: string | null;
  scrollProgress: number;
  failureReason: string | null;
  clarifySessionId: string | null;
  clarifyRunning: boolean;
  clarifyAskAnotherRunning: boolean;
  clarifyCompleting: boolean;
  clarifyActiveQuestionId: string | null;
  clarifyQuestions: EntityState<ClarifyQuestionRecord, string>;
  clarifyAnswers: EntityState<ClarifyAnswerRecord, string>;
  clarifyReasks: EntityState<ClarifyReaskRecord, string>;
  clarifyCompletion: ClarifyCompletionSummary | null;
  clarifyFailureReason: string | null;
  passiveSteps: Record<PassiveStepName, PassiveStepRecord>;
};

const emptyPassiveStep = (step: PassiveStepName): PassiveStepRecord => ({
  step,
  sessionId: null,
  running: false,
  commitSha: null,
  failureReason: null,
  artifacts: [],
  milestones: []
});

export const sessionInitialState: SessionState = {
  activeSessionId: null,
  modelId: null,
  modeId: null,
  specifyPrompt: '',
  specifyRunning: false,
  specifyStarted: false,
  specMarkdown: '',
  artifactPath: null,
  commitSha: null,
  scrollProgress: 0,
  failureReason: null,
  clarifySessionId: null,
  clarifyRunning: false,
  clarifyAskAnotherRunning: false,
  clarifyCompleting: false,
  clarifyActiveQuestionId: null,
  clarifyQuestions: clarifyQuestionsAdapter.getInitialState(),
  clarifyAnswers: clarifyAnswersAdapter.getInitialState(),
  clarifyReasks: clarifyReasksAdapter.getInitialState(),
  clarifyCompletion: null,
  clarifyFailureReason: null,
  passiveSteps: {
    plan: emptyPassiveStep('plan'),
    tasks: emptyPassiveStep('tasks'),
    analyze: emptyPassiveStep('analyze')
  }
};

const sessionSlice = createSlice({
  name: 'session',
  initialState: sessionInitialState,
  reducers: {
    specifyPromptChanged: (state, action: PayloadAction<string>) => {
      state.specifyPrompt = action.payload;
    },
    specifyRunStarted: (state, action: PayloadAction<{ sessionId: string; modelId?: string | null }>) => {
      state.activeSessionId = action.payload.sessionId;
      state.modelId = action.payload.modelId ?? state.modelId;
      state.specifyStarted = true;
      state.specifyRunning = true;
      state.failureReason = null;
    },
    specifyRunProgressed: (state) => {
      state.specifyStarted = true;
      state.specifyRunning = true;
    },
    specifyRunSucceeded: (
      state,
      action: PayloadAction<{ specMarkdown: string; artifactPath: string; commitSha: string }>
    ) => {
      state.specifyRunning = false;
      state.specifyStarted = true;
      state.specMarkdown = action.payload.specMarkdown;
      state.artifactPath = action.payload.artifactPath;
      state.commitSha = action.payload.commitSha;
      state.failureReason = null;
    },
    sessionRestoredFromResume: (
      state,
      action: PayloadAction<{ specMarkdown: string; commitSha: string | null }>
    ) => {
      // Resume hydration (ADR-0016): the live session slice starts empty, so a
      // completed Specify would otherwise render as the empty prompt. Seed the
      // committed spec content + commit so WorkspaceContainer derives Specify as
      // complete with its evidence. A blank spec (in-flight session) leaves
      // Specify pending — no fake "started" flag is set.
      state.specMarkdown = action.payload.specMarkdown;
      state.commitSha = action.payload.commitSha;
      if (action.payload.specMarkdown.length > 0) {
        state.specifyStarted = true;
      }
    },
    specifyRunFailed: (state, action: PayloadAction<{ reason: string }>) => {
      state.specifyRunning = false;
      state.specifyStarted = true;
      state.failureReason = action.payload.reason;
    },
    specifyScrollProgressChanged: (state, action: PayloadAction<number>) => {
      state.scrollProgress = Math.max(0, Math.min(1, action.payload));
    },
    clarifyRunStarted: (state, action: PayloadAction<{ sessionId: string; mode: 'next' | 'askAnother' | 'reaskMalformed' | 'commit'; questionId?: string }>) => {
      state.clarifySessionId = action.payload.sessionId;
      state.clarifyFailureReason = null;
      if (action.payload.mode === 'next') {
        state.clarifyRunning = true;
        state.clarifyCompletion = null;
      } else if (action.payload.mode === 'askAnother') {
        state.clarifyAskAnotherRunning = true;
      } else if (action.payload.mode === 'commit') {
        state.clarifyCompleting = true;
      } else if (action.payload.questionId !== undefined) {
        clarifyReasksAdapter.upsertOne(state.clarifyReasks, {
          id: action.payload.questionId,
          questionId: action.payload.questionId,
          attempts: (state.clarifyReasks.entities[action.payload.questionId]?.attempts ?? 0) + 1,
          inFlight: true,
          category: state.clarifyQuestions.entities[action.payload.questionId]?.malformationCategory ?? 'unknown'
        });
      }
    },
    clarifyQuestionsReceived: (state, action: PayloadAction<{ questions: ClarifyQuestionRecord[]; malformedQuestions?: ClarifyQuestionRecord[]; replace?: boolean }>) => {
      const incoming = [...action.payload.questions, ...(action.payload.malformedQuestions ?? [])];
      if (action.payload.replace === true) {
        clarifyQuestionsAdapter.setAll(state.clarifyQuestions, incoming);
      } else {
        clarifyQuestionsAdapter.upsertMany(state.clarifyQuestions, incoming);
      }
      state.clarifyRunning = false;
      state.clarifyAskAnotherRunning = false;
      for (const question of incoming) {
        if (question.malformed !== true) {
          clarifyReasksAdapter.removeOne(state.clarifyReasks, question.id);
        }
      }
      state.clarifyActiveQuestionId = state.clarifyActiveQuestionId ?? action.payload.questions[0]?.id ?? incoming[0]?.id ?? null;
    },
    clarifyAnswerChanged: (state, action: PayloadAction<{ questionId: string; selectedChoiceKey?: string; shortAnswer?: string }>) => {
      const existing = state.clarifyAnswers.entities[action.payload.questionId];
      clarifyAnswersAdapter.upsertOne(state.clarifyAnswers, {
        id: action.payload.questionId,
        questionId: action.payload.questionId,
        selectedChoiceKey: action.payload.selectedChoiceKey ?? existing?.selectedChoiceKey ?? '',
        shortAnswer: action.payload.shortAnswer ?? existing?.shortAnswer ?? ''
      });
    },
    clarifyActiveQuestionChanged: (state, action: PayloadAction<{ questionId: string }>) => {
      if (state.clarifyQuestions.entities[action.payload.questionId] !== undefined) {
        state.clarifyActiveQuestionId = action.payload.questionId;
      }
    },
    clarifyRunSucceeded: (state, action: PayloadAction<ClarifyCompletionSummary>) => {
      state.clarifyRunning = false;
      state.clarifyAskAnotherRunning = false;
      state.clarifyCompleting = false;
      state.clarifyFailureReason = null;
      state.clarifyCompletion = action.payload;
    },
    clarifyRunFailed: (state, action: PayloadAction<{ reason: string }>) => {
      state.clarifyRunning = false;
      state.clarifyAskAnotherRunning = false;
      state.clarifyCompleting = false;
      state.clarifyFailureReason = action.payload.reason;
    },
    passiveStepRunStarted: (state, action: PayloadAction<{ step: PassiveStepName; sessionId: string; modelId?: string | null }>) => {
      const record = state.passiveSteps[action.payload.step];
      record.sessionId = action.payload.sessionId;
      record.running = true;
      record.failureReason = null;
      state.activeSessionId = action.payload.sessionId;
      state.modelId = action.payload.modelId ?? state.modelId;
    },
    passiveStepRunProgressed: (state, action: PayloadAction<{ step: PassiveStepName }>) => {
      state.passiveSteps[action.payload.step].running = true;
    },
    passiveStepRunSucceeded: (
      state,
      action: PayloadAction<{
        step: PassiveStepName;
        commitSha: string;
        artifacts: PassiveArtifactSummary[];
        milestones?: PassiveMilestoneSummary[];
      }>
    ) => {
      const record = state.passiveSteps[action.payload.step];
      record.running = false;
      record.commitSha = action.payload.commitSha;
      record.failureReason = null;
      record.artifacts = action.payload.artifacts;
      record.milestones = action.payload.milestones ?? [];
    },
    passiveStepRunFailed: (state, action: PayloadAction<{ step: PassiveStepName; reason: string }>) => {
      const record = state.passiveSteps[action.payload.step];
      record.running = false;
      record.failureReason = action.payload.reason;
    }
  },
  extraReducers: () => {}
});

export const {
  specifyPromptChanged,
  specifyRunStarted,
  specifyRunProgressed,
  specifyRunSucceeded,
  sessionRestoredFromResume,
  specifyRunFailed,
  specifyScrollProgressChanged,
  clarifyRunStarted,
  clarifyQuestionsReceived,
  clarifyAnswerChanged,
  clarifyActiveQuestionChanged,
  clarifyRunSucceeded,
  clarifyRunFailed,
  passiveStepRunStarted,
  passiveStepRunProgressed,
  passiveStepRunSucceeded,
  passiveStepRunFailed
} = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
export default sessionReducer;
