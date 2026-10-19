import type { DiagramDefinition } from "@/lib/model";

/** Platform-authored teaching diagrams stored as editable structured data (nodes and edges). */
const at = "2026-10-19T00:00:00.000Z";

type NodeInput = [id: string, label: string, x: number, y: number, step: number, shape?: DiagramDefinition["nodes"][number]["shape"], detail?: string];
type EdgeInput = [source: string, target: string, step: number, label?: string];

function diagram(
  id: string,
  title: string,
  kind: DiagramDefinition["kind"],
  purpose: string,
  altText: string,
  explanationSteps: string[],
  nodes: NodeInput[],
  edges: EdgeInput[]
): DiagramDefinition {
  return {
    id, title, kind, purpose, altText, explanationSteps, updatedAt: at,
    nodes: nodes.map(([nodeId, label, x, y, step, shape = "process", detail = ""]) => ({ id: nodeId, label, x, y, step, shape, detail })),
    edges: edges.map(([source, target, step, label = ""], index) => ({ id: `e${index + 1}`, source, target, step, label }))
  };
}

export const seedDiagrams: DiagramDefinition[] = [
  diagram(
    "ml-pipeline", "Supervised learning pipeline", "ml-pipeline",
    "Shows the order of steps that keeps evaluation honest: everything learned from data is fitted on the training split only.",
    "A left-to-right pipeline: collect data, clean and validate, split into train, validation and test sets, fit preprocessing on the training set only, train the model, evaluate on validation and tune, evaluate once on the test set, then deploy and monitor. A feedback arrow returns from tuning to training.",
    [
      "Collect raw data and record where it came from.",
      "Clean and validate it: types, missing values, duplicates.",
      "Split before learning anything from the data, so the test set stays unseen.",
      "Fit scalers, encoders and imputers on the training split only, then apply them to the other splits.",
      "Train, evaluate on validation data, and tune; repeat as needed.",
      "Use the test set once, at the end, to estimate real-world performance.",
      "Deploy and monitor for drift; collect new labelled data."
    ],
    [
      ["collect", "Collect data", 0, 0, 0, "data", "Record source, licence, and collection date."],
      ["clean", "Clean & validate", 200, 0, 1, "process", "Fix types, handle missing values, remove duplicate rows."],
      ["split", "Split train / validation / test", 400, 0, 2, "decision", "Split before fitting anything. Use time-based splits for time series."],
      ["fit-prep", "Fit preprocessing on train only", 600, 0, 3, "process", "Scaler means and encoder vocabularies come from training rows only."],
      ["train", "Train model", 600, 140, 4, "process"],
      ["validate", "Evaluate on validation & tune", 400, 140, 4, "process", "Hyperparameters are chosen using validation results, never test results."],
      ["test", "Final test evaluation (once)", 200, 140, 5, "process", "Reusing the test set for tuning turns it into a validation set."],
      ["deploy", "Deploy & monitor", 0, 140, 6, "start", "Watch input distributions and live metrics for drift."]
    ],
    [["collect", "clean", 1], ["clean", "split", 2], ["split", "fit-prep", 3], ["fit-prep", "train", 4], ["train", "validate", 4], ["validate", "train", 4, "tune"], ["validate", "test", 5], ["test", "deploy", 6]]
  ),
  diagram(
    "gradient-descent-loop", "Gradient descent loop", "flowchart",
    "Shows the repeated update that trains most machine-learning models.",
    "A flowchart: initialize parameters, compute predictions, compute the loss, compute the gradient of the loss, update the parameters by subtracting learning rate times gradient, then a decision asks whether training has converged. If no, the loop returns to computing predictions; if yes, training stops.",
    [
      "Start from initial parameter values (often small random numbers).",
      "Use the current parameters to make predictions.",
      "Measure how wrong the predictions are with a loss function.",
      "Compute the gradient: the direction in which the loss increases fastest.",
      "Step the other way: θ ← θ − η · ∇L(θ).",
      "Repeat until the loss stops improving or a step budget is used up."
    ],
    [
      ["init", "Initialize θ", 0, 0, 0, "start"],
      ["predict", "Compute predictions", 200, 0, 1],
      ["loss", "Compute loss L(θ)", 400, 0, 2],
      ["grad", "Compute gradient ∇L(θ)", 400, 140, 3],
      ["update", "Update θ ← θ − η∇L(θ)", 200, 140, 4, "process", "η (eta) is the learning rate. Too large and the loss can diverge; too small and progress is slow."],
      ["converged", "Converged?", 0, 140, 5, "decision"],
      ["stop", "Stop", 0, 280, 5, "start"]
    ],
    [["init", "predict", 1], ["predict", "loss", 2], ["loss", "grad", 3], ["grad", "update", 4], ["update", "converged", 5], ["converged", "predict", 5, "no"], ["converged", "stop", 5, "yes"]]
  ),
  diagram(
    "neural-network-2-3-1", "A small feed-forward neural network", "neural-network",
    "Shows how inputs flow through a hidden layer to an output, with every connection carrying a learned weight.",
    "Two input nodes, x1 and x2, each connect to three hidden nodes, h1, h2 and h3. Each hidden node connects to a single output node, y. Hidden nodes apply weights, a bias and an activation function.",
    [
      "Each input feature is one node in the input layer.",
      "Each hidden node computes a weighted sum of all inputs plus a bias, then applies an activation such as ReLU.",
      "The output node combines the hidden activations; for binary classification a sigmoid turns the result into a probability.",
      "Training adjusts every weight and bias with gradient descent, using gradients computed by backpropagation."
    ],
    [
      ["x1", "x₁", 0, 40, 0, "data"], ["x2", "x₂", 0, 200, 0, "data"],
      ["h1", "h₁ = ReLU(w·x + b)", 260, 0, 1], ["h2", "h₂", 260, 120, 1], ["h3", "h₃", 260, 240, 1],
      ["y", "ŷ = σ(v·h + c)", 520, 120, 2, "start", "σ is the sigmoid function, which maps any real number into (0, 1)."]
    ],
    [["x1", "h1", 1], ["x1", "h2", 1], ["x1", "h3", 1], ["x2", "h1", 1], ["x2", "h2", 1], ["x2", "h3", 1], ["h1", "y", 2], ["h2", "y", 2], ["h3", "y", 2]]
  ),
  diagram(
    "attention-block", "Inside a decoder transformer block", "transformer",
    "Shows the computation of causal self-attention followed by the feed-forward sublayer.",
    "Token embeddings plus positional information are projected into queries, keys and values. Scores are computed as Q times K-transpose divided by the square root of the key dimension, a causal mask blocks future positions, softmax turns scores into weights, and the weights average the values. The result is projected, added to the input through a residual connection with layer normalization, and passed through a feed-forward network with another residual connection.",
    [
      "Each token becomes a vector: its embedding plus positional information.",
      "Three learned projections produce queries (Q), keys (K), and values (V).",
      "Scores QKᵀ / √d_k measure how relevant each earlier token is to the current one.",
      "In a decoder, a causal mask sets scores for future tokens to −∞ so the model cannot look ahead.",
      "Softmax turns each row of scores into weights that sum to 1.",
      "The weights average the value vectors; several heads do this in parallel.",
      "Residual connections and layer normalization keep training stable; a feed-forward network then processes each position."
    ],
    [
      ["embed", "Token embeddings + positions", 0, 120, 0, "data"],
      ["qkv", "Projections → Q, K, V", 220, 120, 1],
      ["scores", "Scores QKᵀ / √d_k", 440, 0, 2],
      ["mask", "Causal mask", 660, 0, 3, "decision", "Positions after the current token get −∞ before softmax."],
      ["softmax", "Softmax → weights", 660, 120, 4],
      ["mix", "Weighted sum of V", 440, 240, 5],
      ["residual1", "Output projection + residual + LayerNorm", 220, 240, 6],
      ["ffn", "Feed-forward + residual + LayerNorm", 0, 240, 6]
    ],
    [["embed", "qkv", 1], ["qkv", "scores", 2, "Q, K"], ["scores", "mask", 3], ["mask", "softmax", 4], ["softmax", "mix", 5], ["qkv", "mix", 5, "V"], ["mix", "residual1", 6], ["residual1", "ffn", 6]]
  ),
  diagram(
    "agent-tool-loop", "Tool-calling agent loop with human approval", "workflow",
    "Shows how an agent alternates between model reasoning and validated tool calls, pausing for a person before consequential actions.",
    "A user request goes to the model, which either answers or proposes a tool call. Proposed arguments are validated against the tool schema. A decision checks whether the action is consequential, such as sending an email or committing a price; if so, a human approves or rejects it. Approved or read-only tools execute, and the result returns to the model, which continues until it gives a final answer.",
    [
      "The user's request and the available tool schemas are sent to the model.",
      "The model either answers directly or proposes a tool call with arguments.",
      "Your code validates the arguments; the model's output is never trusted blindly.",
      "Consequential actions (sending messages, prices, orders) stop for human approval.",
      "Tool results go back to the model as new context.",
      "The loop ends with a final answer, or when a step limit is reached."
    ],
    [
      ["user", "User request", 0, 120, 0, "actor"],
      ["model", "Model decides next step", 220, 120, 1],
      ["validate", "Validate tool arguments", 440, 0, 2, "process", "Reject unknown tools, wrong types, and out-of-policy values."],
      ["sensitive", "Consequential action?", 660, 0, 3, "decision"],
      ["human", "Human approval", 660, 140, 3, "actor", "Approve, edit, or reject. Rejections are reported back to the model."],
      ["execute", "Execute tool", 440, 140, 4],
      ["answer", "Final answer", 220, 260, 5, "start"]
    ],
    [["user", "model", 1], ["model", "validate", 2, "tool call"], ["validate", "sensitive", 3], ["sensitive", "execute", 4, "no"], ["sensitive", "human", 3, "yes"], ["human", "execute", 4, "approved"], ["execute", "model", 4, "result"], ["model", "answer", 5, "done"]]
  ),
  diagram(
    "rag-data-flow", "Retrieval-augmented generation data flow", "data-flow",
    "Shows the offline indexing path and the online question-answering path of a RAG system.",
    "Offline: documents are split into chunks, each chunk is embedded, and the vectors are stored in a vector index. Online: the user's question is embedded, the index returns the most similar chunks, the chunks are inserted into the prompt, and the model answers with citations to those chunks.",
    [
      "Offline, documents are split into chunks small enough to retrieve precisely.",
      "Each chunk is converted into an embedding vector and stored with its source metadata.",
      "Online, the question is embedded with the same embedding model.",
      "The index returns the top-k most similar chunks (often by cosine similarity).",
      "The prompt includes those chunks; the model answers and cites them.",
      "Evaluate retrieval separately from generation: a wrong answer may come from a missing chunk."
    ],
    [
      ["docs", "Documents", 0, 0, 0, "data"], ["chunk", "Chunk", 200, 0, 1], ["embed-docs", "Embed chunks", 400, 0, 1], ["index", "Vector index", 600, 0, 2, "data"],
      ["question", "User question", 0, 160, 3, "actor"], ["embed-q", "Embed question", 200, 160, 3], ["retrieve", "Retrieve top-k", 400, 160, 4], ["prompt", "Prompt with context", 600, 160, 5], ["answer", "Answer with citations", 800, 160, 5, "start"]
    ],
    [["docs", "chunk", 1], ["chunk", "embed-docs", 1], ["embed-docs", "index", 2], ["question", "embed-q", 3], ["embed-q", "retrieve", 4], ["index", "retrieve", 4, "similar chunks"], ["retrieve", "prompt", 5], ["prompt", "answer", 5]]
  ),
  diagram(
    "sales-crm-er", "Minimal sales data model", "entity-relationship",
    "An entity-relationship sketch of the records an AI sales assistant reads and writes.",
    "Company has many Contacts and many Quotations. Contact has many Interactions. Quotation has many Quotation lines, and each Quotation line refers to one Product. A Quotation requires an Approval by a person before it is sent.",
    [
      "A Company can have many Contacts (one-to-many).",
      "Every message, call or meeting is an Interaction linked to a Contact, so the history is traceable.",
      "Quotations belong to a Company and contain Quotation lines.",
      "Each line references a Product with its list price; discounts are checked against business rules.",
      "An Approval record captures who approved a quotation and when, before it is sent."
    ],
    [
      ["company", "Company\n(id, name, industry)", 0, 100, 0, "data"],
      ["contact", "Contact\n(id, company_id, email, role)", 260, 0, 1, "data"],
      ["interaction", "Interaction\n(id, contact_id, channel, at, summary)", 540, 0, 2, "data"],
      ["quotation", "Quotation\n(id, company_id, status, total)", 260, 200, 3, "data"],
      ["line", "Quotation line\n(id, quotation_id, product_id, qty, unit_price)", 540, 200, 4, "data"],
      ["product", "Product\n(id, sku, list_price)", 820, 200, 4, "data"],
      ["approval", "Approval\n(id, quotation_id, approver, at)", 260, 340, 5, "data"]
    ],
    [["company", "contact", 1, "1 — *"], ["contact", "interaction", 2, "1 — *"], ["company", "quotation", 3, "1 — *"], ["quotation", "line", 4, "1 — *"], ["line", "product", 4, "* — 1"], ["quotation", "approval", 5, "1 — 0..1"]]
  ),
  diagram(
    "metric-choice", "Choosing a classification metric", "decision-tree",
    "A decision tree for picking an evaluation metric that matches the cost of each kind of mistake.",
    "Start by asking whether the positive class is rare. If not, accuracy may be informative alongside a confusion matrix. If it is rare, ask which mistake is more costly: if missing positives is worse, prioritize recall; if false alarms are worse, prioritize precision; if both matter, use F1 or a precision-recall curve.",
    [
      "Always look at the confusion matrix first.",
      "With a rare positive class, a model that always predicts 'negative' can still score high accuracy.",
      "If missed positives (false negatives) are costly — for example, missed fraud — favour recall.",
      "If false alarms (false positives) are costly — for example, blocking real customers — favour precision.",
      "When both matter, report F1 and the precision–recall trade-off across thresholds."
    ],
    [
      ["start", "Is the positive class rare?", 300, 0, 0, "decision"],
      ["accuracy", "Accuracy can be informative (still check the confusion matrix)", 0, 140, 1, "note"],
      ["cost", "Which mistake costs more?", 560, 140, 1, "decision"],
      ["recall", "Prioritize recall", 320, 300, 2, "start"],
      ["precision", "Prioritize precision", 600, 300, 2, "start"],
      ["f1", "Use F1 / PR curve", 860, 300, 2, "start"]
    ],
    [["start", "accuracy", 1, "no"], ["start", "cost", 1, "yes"], ["cost", "recall", 2, "missed positives"], ["cost", "precision", 2, "false alarms"], ["cost", "f1", 2, "both"]]
  )
];
