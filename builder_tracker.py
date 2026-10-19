import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

def build_sheet_tracker(wb, font_family="Segoe UI"):
    ws = wb.create_sheet("Detailed Learning Tracker")
    ws.views.sheetView[0].showGridLines = True
    
    font_title = Font(name=font_family, size=14, bold=True, color="1A365D")
    font_sub = Font(name=font_family, size=10, italic=True, color="4A5568")
    font_header = Font(name=font_family, size=9, bold=True, color="FFFFFF")
    font_data = Font(name=font_family, size=9, color="2D3748")
    font_bold = Font(name=font_family, size=9, bold=True, color="2D3748")
    font_link = Font(name=font_family, size=9, color="0969DA", underline="single")
    
    fill_header = PatternFill(start_color="1A365D", end_color="1A365D", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_white = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    fill_total = PatternFill(start_color="EDF2F7", end_color="EDF2F7", fill_type="solid")
    
    border_thin = Border(
        left=Side(style='thin', color='CBD5E0'), right=Side(style='thin', color='CBD5E0'),
        top=Side(style='thin', color='CBD5E0'), bottom=Side(style='thin', color='CBD5E0')
    )
    border_double_bottom = Border(
        left=Side(style='thin', color='CBD5E0'), right=Side(style='thin', color='CBD5E0'),
        top=Side(style='thin', color='CBD5E0'), bottom=Side(style='double', color='1A365D')
    )

    # Title
    ws.row_dimensions[1].height = 24
    ws.row_dimensions[2].height = 18
    ws['A1'] = "DETAILED LEARNING SESSION TRACKER"
    ws['A1'].font = font_title
    ws['A2'] = "Granular Session Log: Tracking Planned vs Actual Hours, Confidence, Evidence, Retention & Retrospective Analysis"
    ws['A2'].font = font_sub

    headers = [
        "Learning ID", "Date", "Phase", "Subject", "Topic", "Subtopic",
        "Learning Objective", "Importance", "Prerequisites", "Resource ID",
        "Resource URL", "Resource Type", "Planned Duration (hrs)", "Actual Duration (hrs)",
        "Completion %", "Current Status", "Confidence (1-5)", "Assessment Score (%)",
        "Practical Exercise Completed", "GitHub / Evidence Link", "Key Lessons Learned",
        "Questions or Difficulties", "Next Action", "Review Date", "Completion Date"
    ]
    
    header_row = 4
    ws.row_dimensions[header_row].height = 28
    for col_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=header_row, column=col_idx, value=h)
        c.font = font_header
        c.fill = fill_header
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c.border = border_thin
    ws.freeze_panes = "A5"

    records = [
        # Phase 1: Python & Math
        ("LRN-001", "2026-11-01", "Phase 1", "Python", "Data Structures & OOP", "Classes, Dunder methods, TypedDict", "Master Python OOP design patterns and type hints for AI agent state representations", "High", "Python basics", "RES-017", "https://docs.python.org/3/tutorial/classes.html", "Official Doc", 3.0, 0.0, 0.0, "Not Started", 3, None, "No", "", "", "", "Code custom Pydantic-style class with validation", "2026-11-04", ""),
        ("LRN-002", "2026-11-03", "Phase 1", "Python", "API & JSON Serialization", "requests, httpx, json module, Pydantic", "Build robust async API fetchers with automatic JSON deserialization and error retry loops", "High", "LRN-001", "RES-022", "https://fastapi.tiangolo.com/tutorial/body/", "Documentation", 2.5, 0.0, 0.0, "Not Started", 3, None, "No", "", "", "", "Build CLI weather fetcher with exponential backoff", "2026-11-07", ""),
        ("LRN-003", "2026-11-05", "Phase 1", "Mathematics", "Linear Algebra", "Vectors, Dot products, Matrix Multiplication", "Understand vector geometry and matrix operations essential for embeddings and attention layers", "High", "High school math", "RES-018", "https://numpy.org/doc/stable/user/quickstart.html", "Course/Doc", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Implement 2D and 3D matrix multiply without external libraries", "2026-11-10", ""),
        ("LRN-004", "2026-11-08", "Phase 1", "Mathematics", "Probability & Statistics", "Normal distribution, Bayes Theorem, Hypothesis Testing", "Develop statistical intuition for model confidence scores and A/B test lead conversions", "Medium", "LRN-003", "RES-001", "https://developers.google.com/machine-learning/crash-course", "Course", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Calculate conditional probability of lead conversion using Bayes rule", "2026-11-14", ""),
        ("LRN-005", "2026-11-12", "Phase 1", "Mathematics", "Calculus & Optimization", "Partial derivatives, Gradients, Chain Rule", "Understand loss landscapes and how gradient descent updates weights in ML models", "High", "LRN-003", "RES-001", "https://developers.google.com/machine-learning/crash-course", "Interactive Tutorial", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Write Python script finding minimum of f(x,y)=x^2+2y^2 via gradient descent", "2026-11-18", ""),
        
        # Phase 2: Data Analysis & ML
        ("LRN-006", "2026-12-01", "Phase 2", "Data Analysis", "NumPy & Pandas", "Array broadcasting, DataFrame filtering, GroupBy", "Master fast vectorized operations and sales dataset manipulation using Pandas", "High", "LRN-001, LRN-003", "RES-019", "https://pandas.pydata.org/docs/user_guide/", "Official Guide", 3.0, 0.0, 0.0, "Not Started", 3, None, "No", "", "", "", "Analyze 10,000 sales transactions and calculate cohort retention", "2026-12-05", ""),
        ("LRN-007", "2026-12-05", "Phase 2", "Data Analysis", "Exploratory Data Analysis", "Missing data handling, Outlier detection, Seaborn", "Learn to identify data quality anomalies, skewness, and correlations in B2B CRM datasets", "Medium", "LRN-006", "RES-019", "https://pandas.pydata.org/docs/user_guide/visualization.html", "Hands-on Lab", 2.5, 0.0, 0.0, "Not Started", 3, None, "No", "", "", "", "Produce correlation heatmap and boxplots for lead response times", "2026-12-09", ""),
        ("LRN-008", "2026-12-10", "Phase 2", "Machine Learning", "Supervised Learning", "Linear & Logistic Regression, Odds Ratio", "Understand regression assumptions, classification boundaries, and sigmoid activation", "High", "LRN-005, LRN-006", "RES-016", "https://scikit-learn.org/stable/modules/linear_model.html", "Official Doc", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Build customer churn classifier using LogisticRegression with Scikit-learn", "2026-12-15", ""),
        ("LRN-009", "2026-12-16", "Phase 2", "Machine Learning", "Tree Ensembles", "Decision Trees, Random Forest, XGBoost", "Master feature importance, bagging, boosting, and handling non-linear business tabular data", "High", "LRN-008", "RES-016", "https://scikit-learn.org/stable/modules/ensemble.html", "User Guide", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Train XGBoost classifier predicting whether an inbound lead will book a demo", "2026-12-21", ""),
        ("LRN-010", "2026-12-22", "Phase 2", "Machine Learning", "Model Evaluation & Validation", "Confusion Matrix, ROC-AUC, F1-score, Cross-Validation", "Evaluate classifiers realistically and avoid data leakage in time-series sales pipelines", "High", "LRN-009", "RES-016", "https://scikit-learn.org/stable/modules/model_evaluation.html", "Documentation", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Generate precision-recall curve and evaluate cost of false positive sales calls", "2026-12-28", ""),

        # Phase 3: Deep Learning
        ("LRN-011", "2027-01-02", "Phase 3", "Deep Learning", "PyTorch Tensors & Autograd", "Tensor shapes, GPU tensors, autograd backwards()", "Master tensor manipulation, broadcasting rules, and automatic differentiation in PyTorch", "High", "LRN-003, LRN-005", "RES-014", "https://pytorch.org/tutorials/beginner/basics/tensorqs_tutorial.html", "Official Tutorial", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Write custom linear layer and autograd training loop in PyTorch", "2027-01-06", ""),
        ("LRN-012", "2027-01-08", "Phase 3", "Deep Learning", "Neural Network Architectures", "MLP, Loss functions, AdamW, Dropout", "Build multi-layer perceptron networks, understand learning rate schedules and regularization", "High", "LRN-011", "RES-014", "https://pytorch.org/tutorials/beginner/basics/buildmodel_tutorial.html", "Tutorial", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Train PyTorch MLP classifying customer inquiries into 5 intent categories", "2027-01-13", ""),
        ("LRN-013", "2027-01-15", "Phase 3", "Deep Learning", "Word & Text Embeddings", "Word2Vec, Cosine Similarity, PyTorch nn.Embedding", "Understand how dense semantic representations capture conceptual relationships between words", "High", "LRN-012", "RES-012", "https://huggingface.co/learn/nlp-course/chapter1/1", "Course", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Compute cosine similarity between customer objections using embedding vectors", "2027-01-20", ""),

        # Phase 4: LLMs & Transformers
        ("LRN-014", "2027-02-02", "Phase 4", "LLMs", "Tokenization & Vocabularies", "Byte-Pair Encoding (BPE), tiktoken, SentencePiece", "Understand token boundaries, whitespace sensitivity, token economics, and tokenizer pitfalls", "High", "LRN-001", "RES-012", "https://huggingface.co/learn/nlp-course/chapter2/4", "Interactive", 2.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Tokenize 100 sales emails with tiktoken and measure token cost efficiency", "2027-02-06", ""),
        ("LRN-015", "2027-02-08", "Phase 4", "LLMs", "Transformer Attention Mechanism", "Scaled Dot-Product Attention, Multi-Head Attention", "Deconstruct queries, keys, values (Q, K, V) and mathematical intuitions behind self-attention", "High", "LRN-011, LRN-014", "RES-013", "https://huggingface.co/docs/transformers/index", "Paper / Doc", 4.0, 0.0, 0.0, "Not Started", 1, None, "No", "", "", "", "Code single-head and multi-head attention module in pure PyTorch", "2027-02-14", ""),
        ("LRN-016", "2027-02-18", "Phase 4", "LLMs", "Local Model Inference & Quantization", "GGUF, Ollama, vLLM, llama.cpp, 4-bit/8-bit precision", "Deploy open-source LLMs (Llama-3, Mistral) on Ubuntu Linux with GPU acceleration", "High", "Linux CLI, LRN-014", "RES-009", "https://llama.meta.com/docs", "Official Doc", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Benchmark tokens/sec and VRAM usage of Llama-3-8B 4-bit vs 8-bit locally", "2027-02-24", ""),

        # Phase 5: Prompting & LLM APIs
        ("LRN-017", "2027-03-02", "Phase 5", "LLM APIs", "Structured Outputs & JSON Schema", "Pydantic, OpenAI response_format, Gemini structured mode", "Enforce 100% deterministic JSON schemas from LLM generation for programmatic agent workflows", "High", "LRN-002, LRN-014", "RES-007", "https://platform.openai.com/docs/guides/structured-outputs", "Official Guide", 3.0, 0.0, 0.0, "Not Started", 3, None, "No", "", "", "", "Extract structured BANT lead qualification JSON from raw sales call transcripts", "2027-03-06", ""),
        ("LRN-018", "2027-03-08", "Phase 5", "LLM APIs", "System Prompt Engineering", "Role conditioning, Few-shot demonstrations, Guardrail instructions", "Craft bulletproof system instructions that resist jailbreaking and maintain brand voice", "High", "LRN-017", "RES-004", "https://github.com/google-gemini/cookbook", "Cookbook", 3.0, 0.0, 0.0, "Not Started", 3, None, "No", "", "", "", "Build AI Sales Rep persona with strict guardrails against unauthorized discounting", "2027-03-13", ""),
        ("LRN-019", "2027-03-15", "Phase 5", "LLM APIs", "Evaluation & Cost Tracking", "Prompt bench, Token counting, Latency tracking, LLM-as-a-judge", "Build regression test suite to measure prompt performance across 50 simulated lead scenarios", "Medium", "LRN-017", "RES-008", "https://platform.openai.com/docs/guides/evals", "Guide", 2.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Write automated evaluation script scoring sales responses on a 1-5 rubric", "2027-03-20", ""),

        # Phase 6: Vector Databases & RAG
        ("LRN-020", "2027-03-27", "Phase 6", "RAG", "Document Chunking & Processing", "Semantic chunking, Markdown splitting, Metadata tagging", "Clean and split product manuals, pricing sheets, and objection docs into optimal vector chunks", "High", "LRN-014", "RES-013", "https://huggingface.co/docs/transformers/index", "Hands-on Lab", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Process 50-page enterprise software catalog into chunked JSON with page metadata", "2027-04-01", ""),
        ("LRN-021", "2027-04-03", "Phase 6", "RAG", "Vector Search with pgvector & Chroma", "HNSW indexing, Cosine similarity, PostgreSQL pgvector", "Store and query embeddings efficiently in production PostgreSQL with pgvector extension", "High", "LRN-020, SQL", "RES-023", "https://github.com/pgvector/pgvector", "Official Repo/Doc", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Deploy PostgreSQL container with pgvector and query top-5 matching product docs", "2027-04-08", ""),
        ("LRN-022", "2027-04-12", "Phase 6", "RAG", "Hybrid Search & Cross-Encoder Reranking", "Dense vector search, BM25 keyword search, Cohere Rerank", "Combine keyword exact-matching with semantic retrieval to eliminate retrieval blindspots", "High", "LRN-021", "RES-020", "https://langchain-ai.github.io/langgraph/", "Documentation", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Build hybrid retrieval pipeline that accurately finds specific product part numbers", "2027-04-18", ""),
        ("LRN-023", "2027-04-20", "Phase 6", "RAG", "Grounding, Citations & Hallucination Defense", "Context window injection, Citation extraction, RAG Triad", "Force LLM to produce verified bracketed citations and refuse ungrounded speculative answers", "High", "LRN-022", "RES-004", "https://ai.google.dev/docs", "Cookbook", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Build Product Knowledge Assistant that includes exact manual page references", "2027-04-26", ""),

        # Phase 7: AI Agent Fundamentals & Tool Calling
        ("LRN-024", "2027-05-02", "Phase 7", "AI Agents", "Function & Tool Calling Schemas", "OpenAI tools parameter, JSON schema tool definitions", "Define strict tool interfaces that allow LLMs to invoke external Python functions predictably", "High", "LRN-017", "RES-006", "https://platform.openai.com/docs/guides/function-calling", "Official Doc", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Write tool schemas for `check_inventory(sku)` and `get_client_crm_profile(email)`", "2027-05-07", ""),
        ("LRN-025", "2027-05-10", "Phase 7", "AI Agents", "ReAct Loop Architecture", "Thought-Action-Observation loop, Parse error handling", "Build pure-Python autonomous execution loop that executes tools and feeds output back to LLM", "High", "LRN-024", "RES-020", "https://langchain-ai.github.io/langgraph/", "Tutorial", 4.0, 0.0, 0.0, "Not Started", 1, None, "No", "", "", "", "Implement ReAct agent from scratch without LangChain, calling 3 tools sequentially", "2027-05-16", ""),
        ("LRN-026", "2027-05-18", "Phase 7", "AI Agents", "State Persistence & Memory Design", "SQLite thread memory, Summary buffers, Key-value memory", "Design multi-turn conversation memory that persists agent state across user restarts", "High", "LRN-025", "RES-020", "https://langchain-ai.github.io/langgraph/concepts/persistence/", "Doc", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Save and resume multi-turn sales conversation thread from SQLite database", "2027-05-24", ""),

        # Phase 8: Multi-Agent Systems
        ("LRN-027", "2027-06-02", "Phase 8", "Agent Systems", "State Graphs with LangGraph", "StateGraph, Nodes, Edges, Conditional branches", "Model non-linear business workflows with explicit routing, state updates, and branching", "High", "LRN-026", "RES-020", "https://langchain-ai.github.io/langgraph/", "Framework Doc", 4.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Build LangGraph workflow routing inquiries to either Technical FAQ or Sales Rep", "2027-06-08", ""),
        ("LRN-028", "2027-06-12", "Phase 8", "Agent Systems", "Human-in-the-Loop (HITL) Checkpoints", "Interrupt before tool call, Review approval, Resume state", "Implement safety approvals requiring human sign-off before sending discount quotes or emails", "High", "LRN-027", "RES-020", "https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/", "Guide", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Build approval queue where manager reviews discounts > 15% before sending", "2027-06-18", ""),
        ("LRN-029", "2027-06-20", "Phase 8", "Agent Systems", "Multi-Agent Collaboration with CrewAI", "Role playing, Task delegation, Shared memory, Manager agent", "Orchestrate collaborative agent teams (Lead Researcher, Copywriter, Compliance Officer)", "Medium", "LRN-027", "RES-021", "https://docs.crewai.com/", "Documentation", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Build 3-agent SDR team researching company website and drafting custom pitch", "2027-06-26", ""),

        # Phase 9: AI Sales Agent Development
        ("LRN-030", "2027-07-02", "Phase 9", "Sales Agent", "BANT Lead Qualification Engine", "Budget, Authority, Need, Timing scoring algorithm", "Build deterministic lead scoring logic that extracts qualifying signals from chat history", "High", "LRN-017, LRN-027", "RES-020", "https://langchain-ai.github.io/langgraph/", "Architecture Doc", 4.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Code Python scoring engine that rates leads 0-100 based on BANT answers", "2027-07-08", ""),
        ("LRN-031", "2027-07-12", "Phase 9", "Sales Agent", "Omnichannel Integration (WhatsApp & Email)", "WhatsApp Cloud API, SendGrid API, Webhooks", "Connect agent graph to incoming webhooks to conduct real-time conversations on WhatsApp", "High", "LRN-002, LRN-027", "RES-022", "https://developers.facebook.com/docs/whatsapp/cloud-api/", "API Reference", 4.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Deploy FastAPI webhook receiving WhatsApp messages and returning agent responses", "2027-07-20", ""),
        ("LRN-032", "2027-07-24", "Phase 9", "Sales Agent", "Automated PDF Quotation Generator", "ReportLab, Jinja2 PDF templates, Stripe payment links", "Equip agent with tool generating formal branded PDF sales quotes with dynamic line items", "High", "LRN-024", "RES-017", "https://www.reportlab.com/docs/reportlab-userguide.pdf", "Library Guide", 3.5, 0.0, 0.0, "Not Started", 3, None, "No", "", "", "", "Agent generates validated PDF quote with price and terms and sends via email tool", "2027-08-01", ""),

        # Phase 10: Fine-Tuning
        ("LRN-033", "2027-08-18", "Phase 10", "Fine-Tuning", "Dataset Preparation for Sales Dialogue", "JSONL format, ChatML, Objection-handling pairs", "Prepare high-quality curated dataset of 300+ sales objection handling dialogues", "High", "LRN-001, LRN-017", "RES-011", "https://huggingface.co/docs/trl/index", "Hands-on Lab", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Validate dataset schema and split into 80/20 train/eval JSONL files", "2027-08-24", ""),
        ("LRN-034", "2027-08-26", "Phase 10", "Fine-Tuning", "LoRA / QLoRA with Unsloth / TRL", "Rank r, Alpha, LoRA target modules, 4-bit quantization", "Fine-tune Llama-3-8B on sales objection dataset with minimal VRAM on cloud GPU", "High", "LRN-016, LRN-033", "RES-011", "https://github.com/unslothai/unsloth", "Tutorial", 4.0, 0.0, 0.0, "Not Started", 1, None, "No", "", "", "", "Run QLoRA training run and plot training loss convergence curve", "2027-09-02", ""),

        # Phase 11: Production & Security
        ("LRN-035", "2027-09-18", "Phase 11", "Production", "Docker Containerization & Compose", "Dockerfile, multi-stage builds, docker-compose.yml", "Containerize FastAPI agent backend, PostgreSQL database, and Redis background queues", "High", "Linux, LRN-002", "RES-024", "https://docs.docker.com/compose/", "Official Doc", 3.5, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Run full multi-container agent stack with single `docker-compose up` command", "2027-09-24", ""),
        ("LRN-036", "2027-09-28", "Phase 11", "Production", "LLM Security & OWASP Defense", "Prompt injection defenses, Data leakage, Rate limiting", "Harden sales agent against adversarial system prompt extraction and unauthorized behavior", "High", "LRN-018, LRN-024", "RES-025", "https://owasp.org/www-project-top-10-for-large-language-model-applications/", "Security Guide", 3.0, 0.0, 0.0, "Not Started", 2, None, "No", "", "", "", "Implement input sanitizer filter and automated test suite testing 20 injection attacks", "2027-10-05", "")
    ]

    for idx, r in enumerate(records, start=5):
        ws.row_dimensions[idx].height = 24
        fill = fill_zebra if idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(r, start=1):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = font_bold if c_idx in [1, 5, 8, 16] else font_data
            cell.fill = fill
            cell.border = border_thin
            
            # alignments & formats
            if c_idx in [1, 2, 3, 4, 8, 10, 12, 16, 17, 19, 24, 25]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c_idx in [13, 14]:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '0.0'
            elif c_idx in [15, 18]:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '0%'
            elif c_idx in [11, 20]:
                cell.alignment = Alignment(horizontal='left', vertical='center')
                if val and str(val).startswith("http"):
                    cell.font = font_link
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    # Totals row
    tot_row = len(records) + 5
    ws.row_dimensions[tot_row].height = 24
    ws.merge_cells(start_row=tot_row, start_column=1, end_row=tot_row, end_column=12)
    c_tot = ws.cell(row=tot_row, column=1, value="TOTAL LOGGED HOURS")
    c_tot.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_tot.alignment = Alignment(horizontal='right', vertical='center')
    c_tot.fill = fill_total
    for c in range(1, 13):
        ws.cell(row=tot_row, column=c).border = border_double_bottom
        ws.cell(row=tot_row, column=c).fill = fill_total

    c_plan = ws.cell(row=tot_row, column=13, value=f"=SUM(M5:M{tot_row-1})")
    c_plan.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_plan.fill = fill_total
    c_plan.border = border_double_bottom
    c_plan.alignment = Alignment(horizontal='right', vertical='center')
    c_plan.number_format = '#,##0.0'

    c_act = ws.cell(row=tot_row, column=14, value=f"=SUM(N5:N{tot_row-1})")
    c_act.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_act.fill = fill_total
    c_act.border = border_double_bottom
    c_act.alignment = Alignment(horizontal='right', vertical='center')
    c_act.number_format = '#,##0.0'

    for c in range(15, 26):
        cell = ws.cell(row=tot_row, column=c)
        cell.fill = fill_total
        cell.border = border_double_bottom

    # Validations
    dv_status = DataValidation(type="list", formula1='"Not Started,In Progress,Blocked,Review,Completed,Skipped"', allow_blank=True)
    ws.add_data_validation(dv_status)
    dv_status.add(f"P5:P{tot_row-1}")

    dv_imp = DataValidation(type="list", formula1='"High,Medium,Low"', allow_blank=True)
    ws.add_data_validation(dv_imp)
    dv_imp.add(f"H5:H{tot_row-1}")

    dv_yesno = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
    ws.add_data_validation(dv_yesno)
    dv_yesno.add(f"S5:S{tot_row-1}")

    dv_conf = DataValidation(type="list", formula1='"1,2,3,4,5"', allow_blank=True)
    ws.add_data_validation(dv_conf)
    dv_conf.add(f"Q5:Q{tot_row-1}")

    # Widths
    widths = [11, 12, 11, 14, 24, 24, 30, 11, 14, 11, 24, 14, 13, 13, 12, 13, 12, 14, 13, 24, 25, 25, 25, 12, 12]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.auto_filter.ref = f"A4:Y{tot_row-1}"

print("Detailed Learning Tracker module ready.")
