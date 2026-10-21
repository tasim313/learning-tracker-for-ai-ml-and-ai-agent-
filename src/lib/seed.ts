import type { ApplicationData } from "@/lib/model";
import { addInitialCurriculum } from "@/lib/curriculum";
import { projectSchema, schemaVersion } from "@/lib/model";
import catalog from "@/data/workbook-catalog.json";
import curatedResources from "@/data/learning-resource-catalog.json";
import { sampleBlueprints, sampleQuestionBank } from "@/lib/seed-questions";

const phases = [
  {
    title: "Python & Mathematics Foundations",
    summary: "Build the programming, mathematical, and statistical foundations needed to reason about machine learning.",
    estimatedHours: 60
  },
  {
    title: "Data Analysis & Traditional Machine Learning",
    summary: "Prepare and analyze data, then apply and evaluate classical machine learning methods.",
    estimatedHours: 75
  },
  {
    title: "Deep Learning & Neural Networks",
    summary: "Understand neural network training, backpropagation, and practical tensor computing with PyTorch.",
    estimatedHours: 80
  },
  {
    title: "LLM Fundamentals & Transformer Architecture",
    summary: "Study tokenization, transformer components, attention, and the practical behavior of language models.",
    estimatedHours: 70
  },
  {
    title: "Prompt Engineering & LLM App Development",
    summary: "Build dependable LLM applications with structured outputs, API handling, and evaluation.",
    estimatedHours: 55
  },
  {
    title: "Embeddings, Vector Databases & RAG",
    summary: "Create retrieval-augmented systems that ground responses in useful source material.",
    estimatedHours: 70
  },
  {
    title: "AI Agent Fundamentals & Tool Calling",
    summary: "Build agent loops with validated tools, state, memory, error recovery, and safe execution.",
    estimatedHours: 75
  },
  {
    title: "Agent Orchestration & Multi-Agent Systems",
    summary: "Coordinate workflows and specialist agents with clear handoffs and human approval checkpoints.",
    estimatedHours: 75
  },
  {
    title: "AI Sales Agent Development",
    summary: "Combine research, qualification, grounded answers, guardrailed sales actions, and human escalation.",
    estimatedHours: 95
  },
  {
    title: "Model Fine-Tuning & Customization",
    summary: "Evaluate when fine-tuning is appropriate and build, customize, and measure model adaptations.",
    estimatedHours: 60
  },
  {
    title: "Production Deployment, Security & Monitoring",
    summary: "Deploy and operate AI services with security controls, monitoring, reliability, and cost awareness.",
    estimatedHours: 70
  },
  {
    title: "Advanced AI Engineering & Commercialization",
    summary: "Turn validated AI capabilities into useful products that can be responsibly delivered and maintained.",
    estimatedHours: 65
  }
];

const roadmapTopics = [
  ["Python", "Python data structures and type hints", "Apply collections, functions, type hints, exceptions, JSON, and file operations to reliable AI tooling.", "Implement a typed JSON-backed CLI utility with validation and tests.", 120],
  ["Machine learning", "Data preparation and model evaluation", "Prepare tabular data and evaluate models without leakage using appropriate metrics.", "Build a reproducible baseline classifier and explain its precision and recall.", 180],
  ["Deep learning", "PyTorch tensors and autograd", "Use tensors, automatic differentiation, loss functions, and optimization to train a small model.", "Train and evaluate a small classifier with documented experiments.", 180],
  ["LLMs", "Transformer attention fundamentals", "Explain tokenization, self-attention, positional information, and causal masking.", "Implement a small attention calculation and explain its tensor shapes.", 180],
  ["LLM applications", "Structured LLM application patterns", "Build dependable LLM applications with structured outputs, API handling, and evaluation.", "Create a structured extraction prototype with representative tests.", 150],
  ["RAG", "Retrieval and grounding", "Design ingestion, chunking, retrieval, citations, and retrieval evaluation.", "Build a small documented RAG evaluation set and retrieval baseline.", 180],
  ["Agents", "Agent tool calling and state", "Validate tool inputs and manage state, failure handling, and approval boundaries.", "Build a deterministic tool-calling loop with safe, mocked tools.", 180],
  ["Orchestration", "Workflow orchestration and human approval", "Route tasks between steps and require human approval for consequential actions.", "Demonstrate a workflow that pauses safely before external side effects.", 180],
  ["AI sales agent", "Lead research and qualification", "Research and qualify leads using transparent criteria and human review.", "Build a simulated lead qualification workflow with traceable evidence.", 210],
  ["Fine-tuning", "Fine-tuning decision and evaluation", "Compare prompting, retrieval, and fine-tuning using task-specific data and evaluation.", "Write an experiment plan comparing approaches before training.", 150],
  ["Production AI", "AI service security and observability", "Apply access control, input safety, monitoring, failure handling, and cost limits.", "Document and test a production-readiness checklist for an AI endpoint.", 180],
  ["Commercialization", "AI product validation and responsible delivery", "Validate user needs, constraints, operating costs, and product readiness.", "Produce a tested prototype plan with explicit limitations and user feedback.", 150]
];

export function createSeedData(): ApplicationData {
  const createdAt = "2026-10-19T00:00:00.000Z";
  const sampleQuestions = [
    {
      id: "sample-question-python-types",
      version: 1,
      topicId: "topic-1",
      prompt: "What is the Python type of the value returned by `len([1, 2, 3])`?",
      questionType: "single-choice" as const,
      difficulty: "fundamental" as const,
      critical: false,
      objective: "Reason about built-in Python data types.",
      options: ["int", "str", "list", "bool"],
      correctAnswer: "int",
      acceptedAnswers: [],
      numericTolerance: 0,
      explanation: "`len` returns an integer representing the number of items.",
      misconceptions: ["Assuming a numeric-looking result is a string."],
      rubric: "",
      maxMarks: 1,
      suggestedMinutes: 1,
      source: "Sample question authored for this application; not externally verified.",
      sample: true,
      active: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "sample-question-ml-leakage",
      version: 1,
      topicId: "topic-2",
      prompt: "Name one way information can leak from a validation/test set into a model training pipeline.",
      questionType: "short-answer" as const,
      difficulty: "fundamental" as const,
      critical: false,
      objective: "Recognize data leakage risks.",
      options: [],
      correctAnswer: null,
      acceptedAnswers: [],
      numericTolerance: 0,
      explanation: "Examples include fitting preprocessing on all data before splitting, or using future information in features.",
      misconceptions: [],
      rubric: "Award full credit for a valid concrete leakage mechanism; otherwise review manually.",
      maxMarks: 2,
      suggestedMinutes: 2,
      source: "Sample question authored for this application; not externally verified.",
      sample: true,
      active: true,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "sample-question-pytorch-practical",
      version: 1,
      topicId: "topic-3",
      prompt: "Practical: create a small PyTorch tensor, calculate a differentiable scalar loss, call backward(), and explain how you would verify a gradient was produced. Describe the code and attach independently run evidence.",
      questionType: "practical" as const,
      difficulty: "fundamental" as const,
      critical: true,
      objective: "Demonstrate basic tensor autograd workflow.",
      options: [],
      correctAnswer: null,
      acceptedAnswers: [],
      numericTolerance: 0,
      explanation: "The learner should demonstrate a gradient-enabled tensor, scalar loss, backward pass, and inspect a non-null gradient.",
      misconceptions: [],
      rubric: "Check executable evidence, correct gradient tracking, backward pass, and clear explanation. The app does not execute submitted code.",
      maxMarks: 5,
      suggestedMinutes: 20,
      source: "Sample practical prompt; not externally verified.",
      sample: true,
      active: true,
      createdAt,
      updatedAt: createdAt
    }
  ];
  const capabilityMilestones = [
    "Lead discovery with permitted sources", "Lead qualification with evidence and review",
    "Customer and account research", "Product knowledge grounded in approved sources",
    "Conversation state and safe handoffs", "Email communication prototype with human approval",
    "Web chat prototype with privacy safeguards", "WhatsApp sandbox prototype with explicit consent",
    "Voice interface prototype with disclosure and escalation", "CRM integration with audit history",
    "ERP integration using least-privilege test credentials", "Tool calling with validated inputs and bounded effects",
    "Workflow orchestration with approval checkpoints", "Memory and state with retention controls",
    "Quotation generation within configured commercial rules", "Sales order preparation requiring human confirmation",
    "Human escalation for sensitive decisions", "Error recovery and idempotent operations",
    "AI security and prompt-injection evaluations", "Quality and safety evaluation benchmark",
    "Monitoring, usage limits, and operating cost report", "Deployment runbook and rollback plan",
    "Customer feedback and product readiness review"
  ];
  const topics = [
    ...roadmapTopics.map(([subject, title, description, exercise, estimatedMinutes], index) => ({
      id: `topic-${index + 1}`, phaseId: `phase-${index + 1}`, subject: String(subject), title: String(title),
      description: String(description), objectives: [String(description)], prerequisites: [], difficulty: "beginner" as const,
      priority: index < 3 ? "high" as const : "medium" as const, estimatedMinutes: Number(estimatedMinutes),
      practicalExercise: String(exercise), deliverable: String(exercise),
      completionCriteria: "Explain the key concepts unaided and demonstrate the practical exercise with working evidence.",
      practicalRequired: index !== 11, status: "not-started" as const, confidence: null,
      revisedEstimatedMinutes: null, startedAt: null, completedAt: null, completionEvidence: ""
    })),
    ...(catalog.topics as Omit<ApplicationData["topics"][number], "revisedEstimatedMinutes" | "startedAt" | "completedAt" | "completionEvidence">[]).map((topic) => ({
      revisedEstimatedMinutes: null, startedAt: null, completedAt: null, completionEvidence: "", ...topic
    }))
  ] as ApplicationData["topics"];
  const curriculum = addInitialCurriculum({ topics, subtopics: [], learningTasks: [] });
  return {
    schemaVersion,
    roadmapPhases: phases.map((phase, index) => ({
      id: `phase-${index + 1}`,
      order: index + 1,
      ...phase,
      summary: catalog.phases[index]?.summary ?? phase.summary,
      status: "not-started",
    })),
    topics,
    ...curriculum,
    resources: [...catalog.resources, ...curatedResources] as ApplicationData["resources"],
    learningSessions: [],
    studyPlans: [],
    assessments: [],
    examinationQuestions: [...sampleQuestions, ...sampleQuestionBank],
    examinationBlueprints: [{
      id: "sample-diagnostic-blueprint",
      title: "Foundation diagnostic (sample questions)",
      examType: "diagnostic",
      topicIds: ["topic-1", "topic-2", "topic-3"],
      questionIds: sampleQuestions.map((question) => question.id),
      questionCount: 3,
      learningObjectives: ["Demonstrate Python fundamentals", "Recognize data leakage", "Explain a basic autograd workflow"],
      difficultyDistribution: { fundamental: 3 },
      questionTypes: ["single-choice", "short-answer", "practical"],
      retakePolicy: "unrestricted",
      retakeCooldownHours: 24,
      timeLimitMinutes: 30,
      passingPercent: 80,
      difficulty: "fundamental",
      allowedMaterials: "No notes for a meaningful diagnostic; self-declared.",
      practicalRequirements: "Describe independently executed evidence for the practical prompt.",
      active: true
    }, ...sampleBlueprints],
    examinationAttempts: [],
    courseEnrollments: [],
    lessonProgress: [],
    lessonNotes: [],
    videoProgress: [],
    flashcards: [],
    practiceAttempts: [],
    userDiagrams: [],
    recommendationOverrides: [],
    competencies: [],
    revisionSchedules: [],
    notes: [],
    projects: projectSchema.array().parse([...catalog.projects, ...capabilityMilestones.map((title, index) => ({
      id: `sales-capability-${index + 1}`,
      title,
      description: "Planned AI Sales Employee capability milestone. Progress remains planned until personally demonstrated and evidenced.",
      status: "planned" as const,
      evidenceUrl: "",
      updatedAt: createdAt,
      targetUsers: "B2B sales teams",
      topicIds: index > 8 ? ["topic-9", "topic-11"] : ["topic-7", "topic-8"],
      technologies: [],
      testResults: "",
      plannedHours: 0,
      actualHours: 0,
      demoUrl: "",
      documentationUrl: "",
      knownLimitations: "Prototype only. No autonomous external outreach, pricing commitment, or transaction without explicit human approval.",
      portfolioReady: false,
      tasks: []
    }))]),
    goals: [],
    achievements: [],
    rewards: [],
    dailyReviews: [],
    weeklyReviews: [],
    experiments: [],
    opportunities: [],
    settings: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      weeklyHours: 10,
      studyDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      topicPassingPercent: 80,
      practicalPassingPercent: 80,
      retentionPassingPercent: 70
    }
  };
}
