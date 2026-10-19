import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

def build_sheet_roadmap(wb, font_family="Segoe UI"):
    ws = wb.create_sheet("Master Roadmap")
    ws.views.sheetView[0].showGridLines = True
    
    font_title = Font(name=font_family, size=14, bold=True, color="1A365D")
    font_sub = Font(name=font_family, size=10, italic=True, color="4A5568")
    font_header = Font(name=font_family, size=9, bold=True, color="FFFFFF")
    font_data = Font(name=font_family, size=9, color="2D3748")
    font_bold = Font(name=font_family, size=9, bold=True, color="2D3748")
    
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
    ws['A1'] = "12-MONTH AI & AI AGENT ENGINEERING MASTER ROADMAP"
    ws['A1'].font = font_title
    ws['A2'] = "Structured 12-Phase Pathway from Foundational Mathematics & Python to Commercial Autonomous AI Employees"
    ws['A2'].font = font_sub

    headers = [
        "Phase #", "Phase Name", "Learning Objectives", "Individual Topics",
        "Required Prerequisites", "Target Start Date", "Target Completion Date",
        "Estimated Study Hours", "Actual Hours", "Practical Exercises",
        "Expected Deliverables", "Success Criteria", "Recommended Resources",
        "Current Status", "Actual Completion Date", "Notes and Blockers"
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

    phases_data = [
        (
            1, "Python & Mathematics Foundations",
            "Establish rock-solid programming discipline and mathematical intuitions for machine learning algorithms.",
            "Python data structures, OOP, Exceptions, Typing, JSON/APIs, File I/O, Git/GitHub, Linux CLI, Linear Algebra (Vectors, Matrices, Dot Products), Probability & Statistics, Derivatives & Gradient Descent.",
            "Basic computer literacy, terminal comfort",
            "2026-11-01", "2026-11-30", 60, 0,
            "1. Implement matrix multiplication from scratch without NumPy.\n2. Write gradient descent optimization for 2D function.\n3. Build CLI tool with API fetching and JSON caching.",
            "GitHub repo with clean Python utilities, math scratch notebooks, unit tests with pytest.",
            "Pass self-assessment test: explain eigenvalues, dot products, and write OOP Python classes with type hints and tests without reference.",
            "Python Docs, 3Blue1Brown Essense of Linear Algebra, Khan Academy Statistics",
            "Not Started", "", ""
        ),
        (
            2, "Data Analysis & Traditional Machine Learning",
            "Master data preprocessing, feature engineering, and classical machine learning algorithms with scikit-learn.",
            "NumPy array operations, Pandas DataFrames, Data Cleaning, Exploratory Data Analysis (EDA), Matplotlib/Seaborn, Supervised Learning (Linear/Logistic Regression, Decision Trees, Random Forests, XGBoost), Unsupervised Learning (K-Means, PCA), Overfitting, Cross-validation, Precision/Recall/F1, Data Leakage.",
            "Phase 1: Python, Linear Algebra, Statistics",
            "2026-12-01", "2026-12-31", 75, 0,
            "1. Customer churn prediction with XGBoost.\n2. B2B Sales transaction exploratory data analysis.\n3. Implement Logistic Regression from scratch.",
            "Project 1: Sales Data Analysis & Project 2: Customer Purchase Prediction Model with full EDA notebook and metrics report.",
            "Achieve F1 > 0.82 on test split; demonstrate understanding of bias-variance tradeoff and confusion matrix.",
            "Google ML Crash Course, scikit-learn User Guide, Pandas official docs",
            "Not Started", "", ""
        ),
        (
            3, "Deep Learning & Neural Networks",
            "Build intuition for neural network architectures, backpropagation, and tensor computing with PyTorch.",
            "Tensors, Autograd, Multi-Layer Perceptrons (MLP), Activation Functions (ReLU, GELU, Softmax), Loss Functions (MSE, Cross-Entropy), Optimizers (SGD, AdamW), PyTorch Dataset/DataLoader, Regularization (Dropout, Weight Decay), Convolutional & Sequence Networks, Embeddings.",
            "Phase 2: NumPy, Calculus, ML concepts",
            "2027-01-01", "2027-01-31", 80, 0,
            "1. Build micrograd / mini autograd engine in Python.\n2. Train PyTorch neural network for customer intent classification.\n3. Implement custom PyTorch Dataset for tabular/text data.",
            "Project 3: Customer Message Intent Classification model trained and evaluated in PyTorch.",
            "Explain backpropagation forward/backward pass mathematics on whiteboard; train stable PyTorch model without overfitting.",
            "PyTorch Official Tutorials, fast.ai Practical Deep Learning, Andrej Karpathy nn-zero-to-hero",
            "Not Started", "", ""
        ),
        (
            4, "LLM Fundamentals & Transformer Architecture",
            "Understand how Large Language Models work internally from tokenization to attention mechanisms.",
            "Tokenization (BPE, WordPiece, tiktoken), Transformer Architecture (Encoder, Decoder, Encoder-Decoder), Scaled Dot-Product Attention, Multi-Head Attention, Positional Encodings, Pretraining Objectives, Causal Masking, Context Windows, KV Caching, Quantization (GGUF, AWQ, bitsandbytes).",
            "Phase 3: PyTorch, Neural networks, Embeddings",
            "2027-02-01", "2027-02-28", 70, 0,
            "1. Build self-attention and multi-head attention module in PyTorch.\n2. Tokenize text using tiktoken and examine token distributions.\n3. Run local quantized Llama-3 model using llama.cpp / Ollama.",
            "Clean PyTorch notebook with annotated Transformer attention layer and local inference benchmark script.",
            "Explain scaled dot-product attention equation QK^T / sqrt(d_k) and KV caching latency trade-offs without consulting notes.",
            "Attention Is All You Need paper, Hugging Face NLP Course, Jay Alammar The Illustrated Transformer",
            "Not Started", "", ""
        ),
        (
            5, "Prompt Engineering & LLM App Development",
            "Master programmatic interactions with state-of-the-art LLMs using official APIs, structured outputs, and evaluation.",
            "System Prompts, In-Context Learning, Few-shot prompting, Chain-of-Thought (CoT), Structured Outputs (JSON Schema / Pydantic validation), OpenAI & Gemini APIs, Error handling & retries, Token management & Cost optimization, Prompt injection defenses.",
            "Phase 1 (Python APIs) & Phase 4 (LLM basics)",
            "2027-03-01", "2027-03-25", 55, 0,
            "1. Build B2B lead enrichment pipeline extracting structured JSON from raw company websites.\n2. Implement robust retry with exponential backoff for rate limits.\n3. Benchmark prompt variants across 50 test leads.",
            "Structured extraction library with Pydantic models, JSON schema validation, and token cost counter.",
            "100% valid JSON output compliance over 100 test cases using native structured output modes.",
            "OpenAI Structured Outputs Guide, Gemini API Cookbook, Anthropic Prompt Engineering Interactive Tutorial",
            "Not Started", "", ""
        ),
        (
            6, "Embeddings, Vector Databases & RAG",
            "Construct enterprise-grade Retrieval-Augmented Generation pipelines grounded in private product documentation.",
            "Embedding models (text-embedding-3, BGE, Voyage), Chunking strategies (fixed, semantic, recursive, markdown), Vector similarity (Cosine, Dot Product), Vector databases (ChromaDB, pgvector), Hybrid Search (Dense + Sparse BM25), Reranking (Cohere, Cross-Encoder), Grounding & Citations, RAG Evaluation (RAGAS / TruLens).",
            "Phase 5: LLM APIs, Python",
            "2027-03-26", "2027-04-30", 70, 0,
            "1. Build document ingestion pipeline with semantic chunking.\n2. Set up PostgreSQL with pgvector for persistent vector search.\n3. Implement hybrid search with cross-encoder reranking.",
            "Project 4: Enterprise Product Knowledge Assistant using RAG with citation grounding and evaluation notebook.",
            "Zero hallucination on factual product specifications; retrieval precision > 88% on domain test benchmark.",
            "LangChain / LlamaIndex docs, Pinecone Learning Center, pgvector documentation",
            "Not Started", "", ""
        ),
        (
            7, "AI Agent Fundamentals & Tool Calling",
            "Learn core agentic patterns: reasoning loops, tool calling schemas, environment execution, and state persistence.",
            "Agent Architectures (ReAct, Plan-and-Solve, Reflection), Function Calling / Tool Calling schemas, Tool argument validation with Pydantic, Memory design (short-term buffer, long-term vector/SQL), Execution sandboxing, State persistence, Error recovery & tool retries.",
            "Phase 5 & 6: Structured Outputs, LLM APIs, Vector Stores",
            "2027-05-01", "2027-05-31", 75, 0,
            "1. Build ReAct agent loop from scratch in pure Python.\n2. Equip agent with tools: web search, calculator, SQL query, CRM contact lookup.\n3. Implement persistent SQLite session state.",
            "Project 5: Tool-Using Autonomous Research Agent capable of multi-step company research.",
            "Agent successfully completes 3-step tool chains with proper parameter passing and zero execution crashes.",
            "OpenAI Function Calling Guide, Anthropic Building Effective Agents, LangGraph official tutorials",
            "Not Started", "", ""
        ),
        (
            8, "Agent Orchestration & Multi-Agent Systems",
            "Orchestrate complex workflows, human-in-the-loop approvals, and specialized multi-agent collaboration.",
            "State Graphs with LangGraph, Multi-Agent patterns (Supervisor, Hierarchical, Peer-to-Peer), CrewAI framework, Conditional routing, Dynamic replanning, Human-in-the-loop (HITL) checkpoints & approval gates, Guardrails (NeMo Guardrails, Llama Guard), Context distillation.",
            "Phase 7: Tool Calling & Agent Fundamentals",
            "2027-06-01", "2027-06-30", 75, 0,
            "1. Build a LangGraph workflow with human-approval checkpoint before sending email.\n2. Create 3-agent team: Lead Researcher, Email Drafter, Quality Reviewer.\n3. Implement fallback routing when primary tool fails.",
            "Project 6: Lead Qualification & Scoring Agent + Project 9: Collaborative Multi-Agent Sales Workflow.",
            "Multi-agent workflow handles unexpected tool failure gracefully and pauses execution for human approval on high-value actions.",
            "LangGraph Documentation, CrewAI Masterclass, Llama Guard docs",
            "Not Started", "", ""
        ),
        (
            9, "AI Sales Agent Development (Autonomous Sales Employee)",
            "Synthesize all agentic capabilities into a dedicated, commercial-grade AI Sales Employee.",
            "12 Core Capabilities: Prospecting, BANT Lead Scoring, Consultative Needs Discovery, Multi-channel Communication (Email/Chat/WhatsApp), Knowledge RAG, Price Negotiation within business guardrails, Automated Follow-up sequences, PDF Quotation generation, CRM synchronization (HubSpot/Postgres), Analytics logging, Human escalation triggers.",
            "Phases 6, 7, 8: RAG, Tool Calling, Orchestration",
            "2027-07-01", "2027-08-15", 95, 0,
            "1. Build BANT scoring engine that scores leads from conversation transcripts.\n2. Implement price negotiation agent with strict discount ceilings.\n3. Connect agent to WhatsApp Business sandbox and SendGrid email API.",
            "Project 7: AI Sales Employee with Follow-ups & Project 8: AI Negotiation and Quotation Assistant.",
            "End-to-end simulated customer engagement: agent researches lead, answers questions from RAG, qualifies budget, negotiates price within policy, and outputs signed quote.",
            "HubSpot API Docs, Meta WhatsApp Cloud API Docs, ReportLab PDF documentation",
            "Not Started", "", ""
        ),
        (
            10, "Model Fine-Tuning & Customization",
            "Master when and how to fine-tune open-weight and proprietary models for domain-specific sales style and cost reduction.",
            "When to Prompt vs RAG vs Fine-tune, Dataset preparation & formatting (ShareGPT, Alpaca, JSONL), Parameter-Efficient Fine-Tuning (PEFT, LoRA, QLoRA), SFT (Supervised Fine-Tuning) with TRL / Unsloth, Evaluation with benchmark test suites, Model merging and GGUF export.",
            "Phase 4 & Phase 3: PyTorch, Transformer basics, Quantization",
            "2027-08-16", "2027-09-15", 60, 0,
            "1. Format 500 sales objection-handling pairs into JSONL.\n2. Fine-tune Llama-3-8B with QLoRA using Unsloth on Google Colab / Lambda Labs.\n3. Compare fine-tuned model vs prompt-engineered base model on benchmark set.",
            "Fine-tuned specialized sales objection-handling adapter, training loss curves, and evaluation comparison report.",
            "Fine-tuned model achieves > 92% adherence to company sales methodology with 3x lower inference cost than frontier APIs.",
            "Hugging Face PEFT & TRL docs, Unsloth documentation, Axolotl GitHub",
            "Not Started", "", ""
        ),
        (
            11, "Production Deployment, Security & Monitoring",
            "Engineer reliable, secure, containerized cloud infrastructure for real business usage.",
            "FastAPI async backend, Docker containerization, PostgreSQL database design, Redis message queuing & background tasks, Authentication & API keys, Observability (LangSmith / OpenLLMetry / Arize Phoenix), Rate limiting & token quotas, Security (OWASP Top 10 for LLMs, Prompt Injection, Data Leakage).",
            "Phase 1 (Python, Linux, Git) & Backend familiarity",
            "2027-09-16", "2027-10-15", 70, 0,
            "1. Dockerize full agent system with docker-compose (FastAPI, Redis, Postgres, pgvector).\n2. Instrument agent with OpenTelemetry tracing and LangSmith dashboard.\n3. Add prompt injection sanitization layer and rate limiter.",
            "Project 10: Production-Ready AI Sales Platform deployed on Render / Hetzner with healthchecks and monitoring.",
            "Server maintains 99.5% uptime under simulated load test; zero token quota leaks; full trace visibility on all agent decisions.",
            "Docker Docs, FastAPI Production Guide, OWASP LLM Top 10, LangSmith Docs",
            "Not Started", "", ""
        ),
        (
            12, "Advanced AI Engineering & Commercialization",
            "Package, market, and commercially sell specialized AI agents to business clients.",
            "Product-Market Fit for AI agents, Commercial pricing models (per-agent seat vs usage/success fee), Client onboarding workflows, Multi-tenant data segregation, Sales demos & interactive landing pages, SLA definitions, Customer feedback loops, Maintenance & ongoing agent retraining.",
            "All previous phases: Full working product",
            "2027-10-16", "2027-10-31", 65, 0,
            "1. Draft commercial SaaS terms & SLA agreement for AI Sales Employee.\n2. Build interactive public demo on Render / Vercel.\n3. Conduct 5 customer discovery interviews with sales agency leaders.",
            "Live commercial offering: Landing page, documentation, interactive sales demo, and validated pricing packages.",
            "Secure at least 1 pilot business customer or formal letter of intent (LOI) to deploy AI Sales Employee.",
            "Y Combinator Startup School, Stripe Billing Docs, Commercial Product Validation Sheet",
            "Not Started", "", ""
        )
    ]

    for idx, p in enumerate(phases_data, start=5):
        ws.row_dimensions[idx].height = 55
        fill = fill_zebra if idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(p, start=1):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = font_bold if c_idx in [1, 2, 8, 9, 14] else font_data
            cell.fill = fill
            cell.border = border_thin
            if c_idx in [1, 6, 7, 14, 15]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c_idx in [8, 9]:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '#,##0'
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    # Totals row
    tot_row = len(phases_data) + 5
    ws.row_dimensions[tot_row].height = 24
    ws.merge_cells(start_row=tot_row, start_column=1, end_row=tot_row, end_column=7)
    c_tot = ws.cell(row=tot_row, column=1, value="TOTAL CURRICULUM HOURS")
    c_tot.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_tot.alignment = Alignment(horizontal='right', vertical='center')
    c_tot.fill = fill_total
    for c in range(1, 8):
        ws.cell(row=tot_row, column=c).border = border_double_bottom
        ws.cell(row=tot_row, column=c).fill = fill_total
        
    c_est = ws.cell(row=tot_row, column=8, value=f"=SUM(H5:H{tot_row-1})")
    c_est.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_est.fill = fill_total
    c_est.border = border_double_bottom
    c_est.alignment = Alignment(horizontal='right', vertical='center')
    c_est.number_format = '#,##0'

    c_act = ws.cell(row=tot_row, column=9, value=f"=SUM(I5:I{tot_row-1})")
    c_act.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_act.fill = fill_total
    c_act.border = border_double_bottom
    c_act.alignment = Alignment(horizontal='right', vertical='center')
    c_act.number_format = '#,##0'

    for c in range(10, 17):
        cell = ws.cell(row=tot_row, column=c)
        cell.fill = fill_total
        cell.border = border_double_bottom

    # Data validation for Status (col N)
    dv = DataValidation(type="list", formula1='"Not Started,In Progress,Completed,Blocked,Review"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"N5:N{tot_row-1}")

    # Column widths
    widths = [8, 22, 28, 30, 20, 12, 12, 12, 10, 28, 28, 28, 25, 14, 13, 20]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.auto_filter.ref = f"A4:P{tot_row-1}"

print("Master Roadmap module ready.")
