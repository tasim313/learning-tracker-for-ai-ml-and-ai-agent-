import type { ApplicationData } from "@/lib/model";

/**
 * Sample question bank. Every question is marked `sample: true` and its source says it
 * is platform-authored and not independently verified. Code outputs were checked by
 * running the snippets with CPython 3; numeric answers were recomputed.
 */
type Question = ApplicationData["examinationQuestions"][number];
type Blueprint = ApplicationData["examinationBlueprints"][number];

const at = "2026-10-19T00:00:00.000Z";
const source = "Platform sample question — not independently verified";

function q(fields: Partial<Question> & Pick<Question, "id" | "topicId" | "prompt" | "questionType" | "difficulty" | "explanation">): Question {
  return {
    version: 1, critical: false, objective: "", options: [], correctAnswer: null, acceptedAnswers: [], numericTolerance: 0,
    misconceptions: [], rubric: "", maxMarks: 1, suggestedMinutes: 2, source, sample: true, active: true, createdAt: at, updatedAt: at,
    ...fields
  };
}

export const sampleQuestionBank: Question[] = [
  q({ id: "sample-q-python-sort", topicId: "topic-1", questionType: "code-reading", difficulty: "fundamental", objective: "Read list operations precisely",
    prompt: "What does this program print?\n\n```python\nvalues = [3, 1, 2]\nvalues.sort()\nprint(values[-1] - values[0])\n```",
    correctAnswer: "2", explanation: "sort() orders the list in place to [1, 2, 3]; the last minus the first element is 3 − 1 = 2.",
    misconceptions: ["Thinking sort() returns a new list and leaves `values` unchanged"] }),
  q({ id: "sample-q-python-optional", topicId: "topic-1", questionType: "predict-output", difficulty: "beginner", objective: "Reason about Optional return values",
    prompt: "What does this program print?\n\n```python\nfrom typing import Optional\n\ndef first_word(text: str) -> Optional[str]:\n    words = text.split()\n    return words[0] if words else None\n\nprint(first_word(\"   \"))\n```",
    correctAnswer: "None", explanation: "split() on whitespace-only text returns an empty list, so the function returns None, which print shows as `None`.",
    misconceptions: ["Expecting split() to return [\"\"] for blank text", "Assuming type hints are enforced at runtime"] }),
  q({ id: "sample-q-python-dedupe", topicId: "topic-1", questionType: "code-writing", difficulty: "beginner", objective: "Implement a small, tested utility", maxMarks: 4, suggestedMinutes: 10,
    prompt: "Write `dedupe(items)` that removes duplicates while **preserving first-seen order**. It must satisfy:\n\n```python\nassert dedupe([3, 1, 3, 2, 1]) == [3, 1, 2]\nassert dedupe([]) == []\nassert dedupe([\"a\", \"A\", \"a\"]) == [\"a\", \"A\"]\n```",
    explanation: "A set records seen items while a list keeps order; this runs in O(n). `list(dict.fromkeys(items))` is an equally valid one-line answer.",
    rubric: "1 mark: correct output for all three tests (run them yourself or in an isolated environment; the platform does not execute code). 1 mark: preserves order. 1 mark: O(n) approach (set or dict). 1 mark: clear naming or a type hint. Record the test output as evidence." }),
  q({ id: "sample-q-eval-precision", topicId: "topic-2", questionType: "calculation", difficulty: "beginner", objective: "Compute precision from a confusion matrix",
    prompt: "A classifier has TP = 45 and FP = 15. What is its precision? (Give a decimal, e.g. 0.5.)", correctAnswer: 0.75, numericTolerance: 0.005,
    explanation: "Precision = TP / (TP + FP) = 45 / 60 = 0.75.", misconceptions: ["Using FN instead of FP"] }),
  q({ id: "sample-q-eval-validation", topicId: "topic-2", questionType: "fill-blank", difficulty: "fundamental", objective: "Name the split used for model selection",
    prompt: "Hyperparameters should be chosen using the ______ set, so that the test set is used only once.", correctAnswer: "validation", acceptedAnswers: ["validation set", "dev", "development", "development set"],
    explanation: "Tuning on the test set leaks it into model selection and inflates the final estimate.", misconceptions: ["Tuning on the test set"] }),
  q({ id: "sample-q-eval-overfitting", topicId: "topic-2", questionType: "explanation", difficulty: "beginner", objective: "Explain overfitting without jargon", maxMarks: 3, suggestedMinutes: 6,
    prompt: "Explain overfitting to a non-technical manager in three or four sentences, and say how you would detect it.",
    explanation: "Overfitting means the model memorized quirks of its training data. It is detected by a large gap between training and validation performance.",
    rubric: "1 mark: memorizing the training examples instead of learning general patterns. 1 mark: worse performance on new data. 1 mark: detection by comparing training and validation (or cross-validation) results." }),
  q({ id: "sample-q-pytorch-shapes", topicId: "topic-3", questionType: "calculation", difficulty: "beginner", objective: "Reason about matrix shapes",
    prompt: "A batch with shape (32, 10) is multiplied by a weight matrix with shape (10, 4). How many elements does the result contain?", correctAnswer: 128,
    explanation: "(32 × 10) · (10 × 4) gives shape (32, 4), which has 32 × 4 = 128 elements.", misconceptions: ["Multiplying all four dimensions together"] }),
  q({ id: "sample-q-pytorch-flawed-loop", topicId: "topic-3", questionType: "correct-flawed-solution", difficulty: "intermediate", objective: "Correct a flawed training loop", maxMarks: 3, suggestedMinutes: 8,
    prompt: "This training loop does not reset gradients between steps. Identify the problem, explain its effect, and give the corrected loop.\n\n```python\nfor x, y in loader:\n    loss = loss_fn(model(x), y)\n    loss.backward()\n    optimizer.step()\n```",
    explanation: "PyTorch accumulates gradients in .grad. Without zeroing them, each step uses the sum of all previous gradients.",
    rubric: "1 mark: identifies the missing optimizer.zero_grad() (or model.zero_grad()). 1 mark: explains that gradients accumulate across steps. 1 mark: corrected loop calls zero_grad before backward each iteration." }),
  q({ id: "sample-q-attention-scale", topicId: "topic-4", questionType: "calculation", difficulty: "intermediate", objective: "Apply the attention scaling factor",
    prompt: "A query–key dot product is 8 and the key dimension is d_k = 16. What is the scaled attention score q·k / √d_k?", correctAnswer: 2,
    explanation: "√16 = 4, and 8 / 4 = 2.", misconceptions: ["Dividing by d_k instead of √d_k"] }),
  q({ id: "sample-q-attention-masking", topicId: "topic-4", questionType: "concept-comparison", difficulty: "intermediate", objective: "Compare encoder and decoder self-attention", maxMarks: 3, suggestedMinutes: 6,
    prompt: "Compare self-attention in an encoder (such as BERT) with masked self-attention in a decoder-only language model. When is each appropriate?",
    explanation: "Encoders attend in both directions to build representations; decoders use a causal mask so generation can only use earlier tokens.",
    rubric: "1 mark: encoder attention is bidirectional. 1 mark: decoder attention uses a causal mask that blocks future tokens. 1 mark: matches each to a use (understanding or classification vs. text generation)." }),
  q({ id: "sample-q-llm-structured", topicId: "topic-5", questionType: "debugging", difficulty: "intermediate", objective: "Make structured LLM output robust", maxMarks: 3, suggestedMinutes: 6,
    prompt: "This code crashes in production about 1% of the time:\n\n```python\ndata = json.loads(response_text)\nsend_invoice(data[\"amount\"])\n```\n\nExplain why, and describe a safer approach.",
    explanation: "Model output is not guaranteed to be valid JSON with the expected fields. Validate against a schema and handle failures before acting.",
    rubric: "1 mark: model output may be invalid JSON or miss fields. 1 mark: validate with a schema (for example Pydantic or JSON Schema) or structured outputs. 1 mark: handle failure safely (retry, fallback, or human review) before any side effect." }),
  q({ id: "sample-q-rag-recall", topicId: "topic-6", questionType: "data-interpretation", difficulty: "beginner", objective: "Interpret a retrieval metric",
    prompt: "A query has 4 relevant documents. The retriever's top 5 results contain 3 of them. What is recall@5? (decimal)", correctAnswer: 0.75, numericTolerance: 0.005,
    explanation: "Recall@k = relevant items retrieved in the top k ÷ all relevant items = 3 / 4 = 0.75.", misconceptions: ["Dividing by k (that is precision@k = 3/5)"] }),
  q({ id: "sample-q-rag-chunking", topicId: "topic-6", questionType: "algorithm-design", difficulty: "advanced", objective: "Design a chunking strategy", maxMarks: 4, suggestedMinutes: 12,
    prompt: "Design a chunking strategy for a 300-page product manual with headings, tables, and part numbers, so that a RAG system can answer precise questions. Describe the steps and how you would evaluate it.",
    explanation: "Good answers keep structure (headings and tables), choose a size with overlap, store metadata, and evaluate retrieval with labelled questions.",
    rubric: "1 mark: splits along document structure (sections and headings), keeping tables intact. 1 mark: chunk size and overlap with a justification. 1 mark: metadata such as section and part numbers for filtering or citations. 1 mark: evaluation with a labelled question set and a retrieval metric (for example recall@k)." }),
  q({ id: "sample-q-agent-approval", topicId: "topic-7", questionType: "multiple-select", difficulty: "beginner", objective: "Identify consequential agent actions",
    prompt: "Which actions by an AI sales agent should require human approval?", options: ["Sending a quotation email to a customer", "Searching the product catalogue", "Creating a sales order", "Summarizing a call transcript"],
    correctAnswer: ["Sending a quotation email to a customer", "Creating a sales order"],
    explanation: "Actions with external effects or commercial commitments need approval; read-only and internal actions do not.", misconceptions: ["Treating all tool calls as equally risky"] }),
  q({ id: "sample-q-agent-practical", topicId: "topic-7", questionType: "practical", difficulty: "intermediate", critical: true, objective: "Build a safe tool-calling loop", maxMarks: 5, suggestedMinutes: 60,
    prompt: "Build a deterministic agent loop with mocked tools `lookup_product`, `draft_quote`, and `send_quote`. `send_quote` must require an approval callback. Provide the repository link and the output of your tests.",
    explanation: "Practical evidence shows the loop validates arguments, gates consequential actions, and stops safely.",
    rubric: "1 mark: tool arguments validated against schemas. 1 mark: send_quote cannot run without approval (test shows rejection). 1 mark: invalid arguments return an error to the loop instead of crashing. 1 mark: maximum step limit. 1 mark: tests run and pass, with output provided. Required: approval gating must be demonstrated." }),
  q({ id: "sample-q-orchestration-order", topicId: "topic-8", questionType: "true-false", difficulty: "fundamental", objective: "Place approval checkpoints correctly",
    prompt: "A human approval checkpoint can safely run after the external email has been sent, as long as the approval is logged.", options: ["true", "false"], correctAnswer: "false",
    explanation: "Approval must happen before the side effect; an email cannot be unsent.", misconceptions: ["Confusing audit logging with approval"] }),
  q({ id: "sample-q-sales-bant", topicId: "topic-9", questionType: "single-choice", difficulty: "fundamental", objective: "Recall the BANT qualification framework",
    prompt: "In BANT lead qualification, what does the “A” stand for?", options: ["Authority", "Agreement", "Analytics", "Availability"], correctAnswer: "Authority",
    explanation: "BANT = Budget, Authority (who can decide), Need, Timeline." }),
  q({ id: "sample-q-sales-case", topicId: "topic-9", questionType: "case-study", difficulty: "intermediate", objective: "Qualify a lead from incomplete evidence", maxMarks: 4, suggestedMinutes: 10,
    prompt: "A manufacturing company emails: “We need 200 units next quarter; our procurement head will decide.” Budget is unknown. Using BANT, assess the lead, state what is missing, and describe the agent's next action, including what needs human approval.",
    explanation: "Need and timeline are stated, and the authority is identified but not yet contacted; budget is unknown. The next step is to ask about budget and route any quotation for approval.",
    rubric: "1 mark: identifies need (200 units) and timeline (next quarter). 1 mark: authority = procurement head, not yet engaged. 1 mark: budget unknown and recorded as unknown, not guessed. 1 mark: next action asks or researches budget; a quotation requires human approval." }),
  q({ id: "sample-q-finetune-choice", topicId: "topic-10", questionType: "single-choice", difficulty: "intermediate", objective: "Choose between RAG and fine-tuning",
    prompt: "Product prices and specifications change weekly, and answers must cite the current documentation. Which approach fits best?", options: ["Fine-tune the model every week", "Retrieval-augmented generation over the current documents", "A longer system prompt with last month's prices"], correctAnswer: "Retrieval-augmented generation over the current documents",
    explanation: "Frequently changing facts that must be cited are best supplied at query time through retrieval; fine-tuning bakes in a snapshot and does not provide citations.", misconceptions: ["Believing fine-tuning reliably adds up-to-date factual knowledge"] }),
  q({ id: "sample-q-security-injection", topicId: "topic-11", questionType: "single-choice", difficulty: "intermediate", objective: "Mitigate prompt injection",
    prompt: "Which measure most directly limits the damage from a prompt-injection attack on a tool-using agent?", options: ["Telling the model in the system prompt to ignore malicious instructions", "Enforcing permissions and approvals in application code for every tool call", "Using a larger model"], correctAnswer: "Enforcing permissions and approvals in application code for every tool call",
    explanation: "Instructions in prompts can be overridden; authorization enforced in code still holds when the model is manipulated.", misconceptions: ["Relying on prompt wording as a security boundary"] }),
  q({ id: "sample-q-product-validation", topicId: "topic-12", questionType: "long-answer", difficulty: "intermediate", objective: "Plan product validation", maxMarks: 4, suggestedMinutes: 12,
    prompt: "Before building a full AI Sales Employee, how would you validate that a target customer segment will pay for it? Describe evidence you would collect and what would make you stop or change direction.",
    explanation: "Strong answers rely on customer interviews and behaviour (pilots, pre-commitments) rather than opinions, and define stop criteria in advance.",
    rubric: "1 mark: specific customer segment and problem. 1 mark: evidence from real customers (interviews, pilot, letter of intent), not assumptions. 1 mark: measurable success criteria such as willingness to pay or time saved. 1 mark: explicit stop or pivot criteria." }),
  q({ id: "sample-q-retention-imbalance", topicId: "topic-2", questionType: "true-false", difficulty: "fundamental", objective: "Recall when accuracy misleads",
    prompt: "Accuracy is a reliable headline metric when 98% of examples belong to one class.", options: ["true", "false"], correctAnswer: "false",
    explanation: "Always predicting the majority class already scores 98% accuracy; use precision, recall, or PR curves." }),
  q({ id: "sample-q-retention-recall", topicId: "topic-2", questionType: "short-answer", difficulty: "fundamental", objective: "Recall the recall formula unaided",
    prompt: "Write the formula for recall using TP, FP, and FN.", correctAnswer: "TP/(TP+FN)", acceptedAnswers: ["tp / (tp + fn)", "TP/(FN+TP)", "tp/(fn+tp)", "TP / (TP + FN)"],
    explanation: "Recall = TP / (TP + FN): the share of real positives that were found.", misconceptions: ["Confusing recall with precision, TP / (TP + FP)"] }),
  q({ id: "sample-q-retention-f1", topicId: "topic-2", questionType: "calculation", difficulty: "beginner", objective: "Compute F1 unaided",
    prompt: "TP = 30, FP = 10, FN = 20. What is the F1 score? (3 decimal places)", correctAnswer: 0.6667, numericTolerance: 0.0006,
    explanation: "Precision = 0.75, recall = 0.6, and F1 = 2 · 0.75 · 0.6 / 1.35 ≈ 0.667.", misconceptions: ["Averaging precision and recall arithmetically (0.675)"] })
];

function blueprint(fields: Partial<Blueprint> & Pick<Blueprint, "id" | "title" | "examType" | "topicIds" | "questionIds" | "timeLimitMinutes" | "difficulty">): Blueprint {
  const questions = fields.questionIds.map((id) => sampleQuestionBank.find((question) => question.id === id)!);
  const distribution: Record<string, number> = {};
  for (const question of questions) distribution[question.difficulty] = (distribution[question.difficulty] ?? 0) + 1;
  return {
    questionCount: questions.length, learningObjectives: [...new Set(questions.map((question) => question.objective).filter(Boolean))],
    difficultyDistribution: distribution, questionTypes: [], retakePolicy: "unrestricted", retakeCooldownHours: 24, passingPercent: 80,
    allowedMaterials: "", practicalRequirements: "", active: true,
    ...fields
  };
}

export const sampleBlueprints: Blueprint[] = [
  blueprint({ id: "sample-ai-engineering-diagnostic", title: "AI engineering diagnostic (sample questions)", examType: "diagnostic", difficulty: "beginner", timeLimitMinutes: 40,
    topicIds: ["topic-1", "topic-2", "topic-3", "topic-4", "topic-6", "topic-7", "topic-8", "topic-9", "topic-10", "topic-11"],
    questionIds: ["sample-q-python-sort", "sample-q-eval-precision", "sample-q-pytorch-shapes", "sample-q-attention-scale", "sample-q-rag-recall", "sample-q-agent-approval", "sample-q-orchestration-order", "sample-q-sales-bant", "sample-q-finetune-choice", "sample-q-security-injection"],
    allowedMaterials: "No notes, so the result reflects what you know now. This is self-declared." }),
  blueprint({ id: "sample-topic-exam-evaluation", title: "Topic exam: data preparation and evaluation (sample)", examType: "topic", difficulty: "beginner", timeLimitMinutes: 25,
    topicIds: ["topic-2"], questionIds: ["sample-q-eval-precision", "sample-q-eval-validation", "sample-q-eval-overfitting"],
    retakePolicy: "cooldown", retakeCooldownHours: 24, allowedMaterials: "Open-book is not allowed for this topic examination." }),
  blueprint({ id: "sample-topic-exam-python", title: "Topic exam: Python reading and writing (sample)", examType: "topic", difficulty: "beginner", timeLimitMinutes: 25,
    topicIds: ["topic-1"], questionIds: ["sample-q-python-sort", "sample-q-python-optional", "sample-q-python-dedupe"] }),
  blueprint({ id: "sample-practical-agents", title: "Practical exam: safe tool-calling agent (sample)", examType: "practical", difficulty: "intermediate", timeLimitMinutes: 120,
    topicIds: ["topic-7"], questionIds: ["sample-q-agent-practical", "sample-q-agent-approval"],
    practicalRequirements: "The approval-gating acceptance test must pass. Provide a repository link and test output. Code is reviewed, not executed, by the platform.",
    allowedMaterials: "Open-book: documentation and your own notes are allowed." }),
  blueprint({ id: "sample-retention-evaluation", title: "Delayed retention check: model evaluation (sample)", examType: "retention", difficulty: "fundamental", timeLimitMinutes: 15,
    topicIds: ["topic-2"], questionIds: ["sample-q-retention-imbalance", "sample-q-retention-recall", "sample-q-retention-f1"], passingPercent: 70,
    allowedMaterials: "No notes. Take this at least a few days after you last studied the topic." }),
  blueprint({ id: "sample-closed-book-attention", title: "Closed-book check: attention (sample)", examType: "closed-book", difficulty: "intermediate", timeLimitMinutes: 20,
    topicIds: ["topic-4"], questionIds: ["sample-q-attention-scale", "sample-q-attention-masking"], allowedMaterials: "None (closed-book, self-declared)." }),
  blueprint({ id: "sample-comprehensive-llm-apps", title: "Comprehensive skill exam: LLM applications (sample)", examType: "comprehensive", difficulty: "intermediate", timeLimitMinutes: 60,
    topicIds: ["topic-3", "topic-5", "topic-6", "topic-9", "topic-12"], questionIds: ["sample-q-pytorch-flawed-loop", "sample-q-llm-structured", "sample-q-rag-chunking", "sample-q-sales-case", "sample-q-product-validation"],
    allowedMaterials: "Open-book." })
];

/** Add any sample questions and blueprints missing from existing data, without changing saved ones. */
export function appendMissingSamples(data: { examinationQuestions: Question[]; examinationBlueprints: Blueprint[] }) {
  const questionIds = new Set(data.examinationQuestions.map((question) => question.id));
  const blueprintIds = new Set(data.examinationBlueprints.map((item) => item.id));
  const questions = [...data.examinationQuestions, ...sampleQuestionBank.filter((question) => !questionIds.has(question.id))];
  const available = new Set(questions.map((question) => question.id));
  const blueprints = [...data.examinationBlueprints, ...sampleBlueprints.filter((item) => !blueprintIds.has(item.id) && item.questionIds.every((id) => available.has(id)))];
  return { examinationQuestions: questions, examinationBlueprints: blueprints };
}
