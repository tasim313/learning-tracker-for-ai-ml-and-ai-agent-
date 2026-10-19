export type FieldType = "text" | "textarea" | "number" | "date" | "url" | "select" | "checkbox" | "topic" | "phase" | "topics";
export type FieldDefinition = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  help?: string;
};

export type FeaturePageDefinition = {
  title: string;
  description: string;
  collection: string;
  fields: FieldDefinition[];
  readOnly?: boolean;
};

const fields = {
  text: (name: string, label: string, required = true): FieldDefinition => ({ name, label, type: "text", required }),
  textarea: (name: string, label: string, required = false): FieldDefinition => ({ name, label, type: "textarea", required }),
  number: (name: string, label: string, required = true): FieldDefinition => ({ name, label, type: "number", required }),
  select: (name: string, label: string, options: string[], required = true): FieldDefinition => ({ name, label, type: "select", options, required }),
  topic: (name = "topicId", label = "Topic", required = true): FieldDefinition => ({ name, label, type: "topic", required }),
  topics: (name = "topicIds", label = "Related topics"): FieldDefinition => ({ name, label, type: "topics" })
};

export const featurePages: Record<string, FeaturePageDefinition> = {
  topics: {
    title: "Topics and tasks",
    description: "Manage what you are learning and what you can demonstrate. Finishing learning does not itself establish competency.",
    collection: "topics",
    fields: [
      fields.text("title", "Topic title"), fields.select("phaseId", "Roadmap phase", [], true),
      fields.text("subject", "Subject"), fields.textarea("description", "Description and learning objectives"),
      fields.textarea("objectives", "Learning objectives (one per line)", false),
      fields.textarea("practicalExercise", "Practical exercise", false),
      fields.textarea("deliverable", "Expected deliverable", false),
      fields.textarea("completionCriteria", "Measurable completion criteria", false),
      fields.topics("prerequisites", "Prerequisite topic IDs (comma-separated)"),
      fields.select("difficulty", "Difficulty", ["fundamental", "beginner", "intermediate", "advanced"]),
      fields.select("priority", "Priority", ["low", "medium", "high"]),
      fields.number("estimatedMinutes", "Estimated minutes"),
      fields.select("status", "Learning status", ["backlog", "not-started", "ready-to-learn", "in-progress", "needs-practice", "needs-revision", "blocked", "completed"]),
      { name: "practicalRequired", label: "Require practical evidence for competency", type: "checkbox" },
      fields.select("confidence", "Self-rated confidence (1–5)", ["1", "2", "3", "4", "5"], false)
    ]
  },
  sessions: {
    title: "Session history",
    description: "Review completed and interrupted sessions, focused time, breaks, and your notes. Historical duration corrections are marked.",
    collection: "learningSessions",
    fields: [fields.textarea("notes", "Session notes", false), fields.textarea("accomplishments", "Accomplishments", false), fields.textarea("problems", "Problems encountered", false), fields.textarea("distractions", "Distractions", false), fields.number("focusedSeconds", "Manually corrected focused seconds", false), fields.textarea("manualAdjustmentNote", "Required reason for a time correction", false), fields.select("rating", "Session rating", ["1", "2", "3", "4", "5"], false)]
  },
  timer: {
    title: "Learning timer",
    description: "Timer state is saved as timestamps, so the elapsed time is recalculated after refreshes or restarts. One active session at a time.",
    collection: "learningSessions",
    fields: [],
    readOnly: true
  },
  planner: {
    title: "Daily and weekly planner",
    description: "Plan realistic study sessions and rest days. Planned work is never marked complete automatically.",
    collection: "studyPlans",
    fields: [fields.text("title", "Plan item"), { name: "date", label: "Date", type: "date", required: true }, fields.topics(), fields.number("plannedMinutes", "Planned minutes"), { name: "restDay", label: "Rest day", type: "checkbox" }, { name: "completed", label: "Completed", type: "checkbox" }]
  },
  resources: {
    title: "Resource library",
    description: "Save documentation, courses, papers, videos, books, repositories, datasets, and articles with notes and progress.",
    collection: "resources",
    fields: [fields.text("title", "Resource name"), { name: "url", label: "Resource URL", type: "url", required: true }, fields.select("type", "Resource type", ["documentation", "course", "paper", "tutorial", "book", "video", "audio", "slide", "practice", "repository", "dataset", "article", "api"]), fields.select("phaseId", "Roadmap phase", [], true), fields.topics(), fields.select("difficulty", "Difficulty", ["fundamental", "beginner", "intermediate", "advanced"]), fields.number("estimatedMinutes", "Estimated study minutes"), fields.select("status", "Status", ["to-study", "in-progress", "completed", "reference"]), fields.select("rating", "Rating (1–5)", ["1", "2", "3", "4", "5"], false), fields.textarea("notes", "Notes", false), fields.textarea("takeaways", "Key takeaways", false)]
  },
  "course-materials": {
    title: "Course materials",
    description: "Browse the Spring 2026 course schedules, slides, recordings, practice materials, and reference links copied from the shared course workbook.",
    collection: "resources",
    fields: [],
    readOnly: true
  },
  knowledge: {
    title: "Knowledge base",
    description: "Keep searchable Markdown-compatible explanations, code notes, mistakes, solutions, and revision notes.",
    collection: "notes",
    fields: [fields.text("title", "Note title"), fields.topic("topicId", "Related topic (optional)", false), fields.textarea("tags", "Tags (comma-separated)", false), fields.textarea("body", "Note body (Markdown text)")]
  },
  revisions: {
    title: "Revision planner",
    description: "Spaced revision intervals help you practice retention; completing a schedule never marks a topic mastered.",
    collection: "revisionSchedules",
    fields: [fields.topic(), { name: "dueAt", label: "Due at", type: "date", required: true }, fields.number("intervalDays", "Interval days"), fields.number("lastScorePercent", "Last score (%)", false)]
  },
  assessments: {
    title: "Self-assessment",
    description: "Record confidence separately from verified exam results. Scores and evidence remain historical.",
    collection: "assessments",
    fields: [
      fields.topic(),
      ...["conceptual", "recall", "implementation", "problemSolving", "debugging", "retention", "application", "teaching"].map((dimension) => fields.select(`dimensions.${dimension}`, humanize(dimension), ["1", "2", "3", "4", "5"])),
      fields.select("confidence", "Confidence (1–5)", ["1", "2", "3", "4", "5"]),
      fields.number("scorePercent", "Verified assessment score (%)", false),
      fields.textarea("evidence", "Evidence: explanation, code, demo, quiz or repository"),
      fields.textarea("recommendation", "Recommended next action", false)
    ]
  },
  questions: {
    title: "Question bank",
    description: "Create versioned practice questions. Editing a question creates a new version; submitted exam snapshots stay unchanged.",
    collection: "examinationQuestions",
    fields: [fields.topic(), fields.textarea("prompt", "Question prompt"), fields.select("questionType", "Question type", ["single-choice", "multiple-select", "true-false", "fill-blank", "short-answer", "long-answer", "practical", "code-reading", "debugging", "calculation", "case-study"]), fields.select("difficulty", "Difficulty", ["fundamental", "beginner", "intermediate", "advanced"]), fields.textarea("objective", "Learning objective", false), fields.textarea("options", "Answer options (one per line; objective questions)", false), fields.textarea("correctAnswer", "Correct answer (objective questions)", false), fields.number("numericTolerance", "Numeric answer tolerance", false), fields.textarea("acceptedAnswers", "Accepted answer variations (one per line)", false), fields.textarea("explanation", "Explanation and rationale"), fields.textarea("misconceptions", "Possible misconceptions (one per line)", false), fields.textarea("rubric", "Manual grading rubric for written/practical items", false), fields.number("maxMarks", "Maximum marks"), fields.number("suggestedMinutes", "Suggested minutes"), fields.text("source", "Source or reference", false), { name: "critical", label: "Critical acceptance question; must pass", type: "checkbox" }, { name: "sample", label: "Sample question (not externally verified)", type: "checkbox" }, { name: "active", label: "Active in question bank", type: "checkbox" }]
  },
  "exam-library": {
    title: "Examination library",
    description: "Create reusable examination blueprints from your question bank and topic objectives.",
    collection: "examinationBlueprints",
    fields: [fields.text("title", "Examination name"), fields.select("examType", "Examination type", ["diagnostic", "topic", "practical", "closed-book", "open-book", "cumulative", "retention", "comprehensive"]), fields.topics(), fields.textarea("questionIds", "Question pool IDs (comma-separated; create questions first)"), fields.number("questionCount", "Number of questions"), fields.textarea("learningObjectives", "Learning objectives covered (one per line)", false), fields.textarea("questionTypes", "Included question types (comma-separated)", false), fields.textarea("difficultyDistribution", "Difficulty distribution (one difficulty=count per line; overrides default difficulty)", false), fields.number("timeLimitMinutes", "Time limit (minutes)"), fields.number("passingPercent", "Passing threshold (%)"), fields.select("difficulty", "Default difficulty", ["fundamental", "beginner", "intermediate", "advanced"]), fields.select("retakePolicy", "Retake policy", ["unrestricted", "cooldown"]), fields.number("retakeCooldownHours", "Retake cooldown (hours)"), fields.textarea("allowedMaterials", "Allowed reference materials", false), fields.textarea("practicalRequirements", "Required practical evidence / acceptance tests", false), { name: "active", label: "Available to take", type: "checkbox" }]
  },
  exams: {
    title: "Examination dashboard",
    description: "Choose a configured examination, review the rules, and start a timed, persisted attempt. Closed-book status is self-declared.",
    collection: "examinationBlueprints",
    fields: [],
    readOnly: true
  },
  "active-exam": {
    title: "Active examination",
    description: "Continue an in-progress assessment, save draft answers, or submit for grading.",
    collection: "examinationAttempts",
    fields: [],
    readOnly: true
  },
  "practical-exam": {
    title: "Practical examination",
    description: "Submit practical evidence and self-review against a rubric. User-submitted code is not executed by the application.",
    collection: "examinationAttempts",
    fields: [],
    readOnly: true
  },
  "exam-results": {
    title: "Examination results and answer review",
    description: "Inspect preserved question versions, answers, marks, feedback, and improvement between attempts.",
    collection: "examinationAttempts",
    fields: [],
    readOnly: true
  },
  "answer-review": {
    title: "Answer review",
    description: "Review submitted answers beside the exact saved question snapshot and available explanation.",
    collection: "examinationAttempts",
    fields: [],
    readOnly: true
  },
  gaps: {
    title: "Learning gap analysis",
    description: "Review incorrect or incomplete answers and practical requirements. Root causes are not inferred without evidence.",
    collection: "examinationAttempts",
    fields: [],
    readOnly: true
  },
  competency: {
    title: "Competency dashboard",
    description: "Competency is separate from course completion and confidence. Practical evidence and retention are required for mastery.",
    collection: "competencies",
    fields: [],
    readOnly: true
  },
  "exam-history": {
    title: "Examination history",
    description: "Immutable record of exam attempts; each attempt keeps the exact question version used.",
    collection: "examinationAttempts",
    fields: [],
    readOnly: true
  },
  "exam-analytics": {
    title: "Examination analytics",
    description: "Score history, first attempt and best attempt summaries are calculated from saved attempts.",
    collection: "examinationAttempts",
    fields: [],
    readOnly: true
  },
  discipline: {
    title: "Discipline tracker",
    description: "View actual study days and streaks. Rest, illness, and reasonable breaks are not penalized.",
    collection: "learningSessions",
    fields: [],
    readOnly: true
  },
  rewards: {
    title: "Rewards and achievements",
    description: "Transparent records of earned points and achievements. No automatic duplicate rewards are created.",
    collection: "rewards",
    fields: [],
    readOnly: true
  },
  goals: {
    title: "Goals and aspirations",
    description: "Set realistic learning milestones and target dates.",
    collection: "goals",
    fields: [fields.text("title", "Goal"), { name: "targetDate", label: "Target date", type: "date" }, { name: "completed", label: "Completed", type: "checkbox" }]
  },
  projects: {
    title: "Projects and portfolio",
    description: "Connect learning to working engineering outcomes, milestone tasks, evidence, and portfolio readiness.",
    collection: "projects",
    fields: [fields.text("title", "Project title"), fields.textarea("description", "Problem statement and learning objectives"), fields.textarea("targetUsers", "Target users", false), fields.topics(), fields.textarea("technologies", "Technologies (comma-separated)", false), fields.textarea("tasks", "Milestone tasks (one per line; prefix completed tasks with [x])", false), fields.select("status", "Project status", ["planned", "in-progress", "completed", "blocked"]), fields.number("plannedHours", "Planned hours"), fields.number("actualHours", "Actual hours"), { name: "evidenceUrl", label: "Repository URL", type: "url" }, { name: "demoUrl", label: "Demo URL", type: "url" }, { name: "documentationUrl", label: "Documentation URL", type: "url" }, fields.textarea("testResults", "Testing results and acceptance evidence", false), fields.textarea("knownLimitations", "Known limitations", false), { name: "portfolioReady", label: "Ready for portfolio", type: "checkbox" }]
  },
  "sales-agent": {
    title: "AI Sales Employee roadmap",
    description: "Track safe, human-reviewed prototypes for lead discovery, qualification, grounded product answers, communication, integrations, approvals, evaluation, deployment, and costs.",
    collection: "projects",
    fields: [fields.text("title", "Sales-agent milestone"), fields.textarea("description", "Measurable milestone and safeguards"), fields.select("status", "Status", ["planned", "in-progress", "completed", "blocked"]), fields.textarea("technologies", "Technologies (comma-separated)", false), fields.number("plannedHours", "Planned hours"), fields.textarea("knownLimitations", "Limitations and human-approval boundary", false)]
  },
  reports: {
    title: "Reports and analytics",
    description: "Review actual study time, learning completion, assessment records, revisions, and project status. Export CSV or printable reports.",
    collection: "learningSessions",
    fields: [],
    readOnly: true
  },
  backup: {
    title: "Backup and restore",
    description: "Export a complete JSON backup, create an automatic retained snapshot, or validate and explicitly confirm a full restore.",
    collection: "settings",
    fields: [],
    readOnly: true
  },
  settings: {
    title: "Settings",
    description: "Configure local timezone, realistic weekly targets, study-day preferences, and competency thresholds.",
    collection: "settings",
    fields: [],
    readOnly: true
  },
  experiments: {
    title: "AI experiment log",
    description: "Plan reproducible experiments and record measured results only after you run them. Seeded examples are never treated as your results.",
    collection: "experiments",
    fields: [
      fields.text("title", "Experiment title"), fields.select("status", "Status", ["planned", "conducted"]),
      { name: "conductedAt", label: "Run date (required when conducted)", type: "date" },
      fields.textarea("hypothesis", "Research question or hypothesis"), fields.text("modelProvider", "Model or provider", false),
      fields.text("modelVersion", "Model version", false), fields.textarea("dataset", "Dataset or test suite", false),
      fields.textarea("configuration", "Prompt, parameters, and configuration", false),
      fields.textarea("evaluationBenchmark", "Evaluation benchmark", false), fields.text("primaryMetric", "Primary metric", false),
      fields.number("latencyMs", "Latency in milliseconds", false), fields.number("costPerRun", "Cost per run", false),
      fields.text("compute", "Compute / memory", false), fields.textarea("failureCases", "Failure cases", false),
      fields.textarea("baseline", "Comparison baseline", false), fields.textarea("conclusion", "Conclusion and evidence", false),
      fields.textarea("nextExperiment", "Next experiment", false)
    ]
  },
  opportunities: {
    title: "Commercial product validation",
    description: "Track customer discovery and product assumptions. Keep estimates distinct from observed customer evidence.",
    collection: "opportunities",
    fields: [
      fields.text("title", "Product or agent concept"), fields.text("targetIndustry", "Target industry", false),
      fields.text("customerSegment", "Customer segment", false), fields.textarea("coreProblem", "Customer problem", false),
      fields.textarea("currentWorkflow", "Current workflow", false), fields.text("currentCost", "Current cost or time", false),
      fields.textarea("proposedSolution", "Proposed solution", false),
      { name: "interviewDate", label: "Customer interview date", type: "date" },
      fields.textarea("customerFeedback", "Observed customer feedback", false), fields.text("willingnessToPay", "Willingness to pay", false),
      fields.textarea("competitors", "Alternatives and competitors", false),
      fields.select("technicalFeasibility", "Technical feasibility", ["unknown", "low", "medium", "high"]),
      fields.textarea("integrationRequirements", "Integration requirements", false),
      fields.text("estimatedOperatingCost", "Estimated operating cost", false), fields.textarea("expectedBusinessRoi", "Expected business ROI (hypothesis)", false),
      fields.select("validationStatus", "Validation status", ["idea", "problem-confirmed", "customer-interviewed", "solution-validated", "pilot"]),
      fields.textarea("nextAction", "Next action", false)
    ]
  }
};

export function getFeaturePage(section: string) {
  return featurePages[section] ?? null;
}

function humanize(value: string) {
  return value.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
