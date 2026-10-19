import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

def build_sheet_projects(wb, font_family="Segoe UI"):
    ws = wb.create_sheet("AI Project Backlog")
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
    ws['A1'] = "AI PROJECT BACKLOG & PRACTICAL PORTFOLIO ROADMAP"
    ws['A1'].font = font_title
    ws['A2'] = "10 Practical Milestones Progressing from Core Data Science to an Autonomous, Commercial-Grade AI Sales Employee Platform"
    ws['A2'].font = font_sub

    headers = [
        "Project ID", "Project Name", "Business Problem", "Learning Phase",
        "Required Skills", "Technology Stack", "Feature List", "Prerequisites",
        "Tasks and Subtasks", "Target Date", "Status", "Priority",
        "Estimated Effort (hrs)", "Actual Effort (hrs)", "Acceptance Criteria",
        "Testing Requirements", "GitHub Repository", "Demo URL",
        "Known Risks", "Lessons Learned / Next Milestone"
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

    projects = [
        (
            "PRJ-001", "Sales Data Analysis & Customer Segmentation",
            "Sales teams lack visibility into which customer segments generate the highest lifetime value and have the shortest sales cycles.",
            "Phase 2", "Data cleaning, feature engineering, statistical aggregation, exploratory visualization",
            "Python, Pandas, NumPy, Matplotlib, Seaborn, Jupyter Notebook",
            "1. Automated ingestion of raw CRM transaction CSVs.\n2. Customer RFM (Recency, Frequency, Monetary) segmentation.\n3. Sales pipeline velocity calculation by industry.\n4. Correlation matrix and interactive cohort heatmaps.",
            "Phase 1 Python & statistics",
            "1. Data hygiene & outlier treatment.\n2. Calculate RFM scores.\n3. Segment customers into 4 quartiles.\n4. Produce markdown executive summary.",
            "2026-12-20", "Not Started", "High", 25.0, 0.0,
            "Clean reproducible Jupyter notebook producing RFM segments, visual charts, and actionable sales recommendations without execution errors.",
            "Pytest asserting data cleaning functions handle NaNs and duplicate transaction IDs properly.",
            "https://github.com/tasim/sales-data-segmentation", "",
            "Missing transaction records and dirty timestamp formats in real-world CRM extracts.",
            "Mastered vectorized Pandas operations and business KPI definitions."
        ),
        (
            "PRJ-002", "Customer Purchase Prediction Model",
            "Sales reps waste 60% of their time calling cold leads who have almost zero probability of purchasing enterprise software.",
            "Phase 2", "Supervised classification, feature scaling, model selection, hyperparameter tuning, metric evaluation",
            "Python, Scikit-Learn, XGBoost, Pandas, Joblib",
            "1. Feature pipeline transforming categorical company data and engagement signals.\n2. Trained XGBoost classifier predicting purchase probability.\n3. Threshold optimizer prioritizing high-precision lead calling.\n4. Exportable scoring pipeline function.",
            "PRJ-001, Scikit-learn basics",
            "1. Feature selection & train/test split.\n2. Address class imbalance with SMOTE/class weights.\n3. Grid search hyperparameter tuning.\n4. Save trained pipeline to .joblib.",
            "2026-12-31", "Not Started", "High", 30.0, 0.0,
            "Classifier achieves ROC-AUC > 0.85 and Precision > 75% on held-out test split, outperforming naive baseline by 3x.",
            "Cross-validation verification asserting zero feature leakage between train and test folds.",
            "https://github.com/tasim/lead-purchase-predictor", "",
            "Overfitting to historical data due to shifting customer behavior seasonality.",
            "Learned how to set decision thresholds based on actual sales call labor cost."
        ),
        (
            "PRJ-003", "Customer Message Intent & Urgency Classifier",
            "Customer inquiries arrive in high volume across email and chat without automated routing to appropriate specialists.",
            "Phase 3", "Neural network architecture, text tokenization, embeddings, PyTorch training loop",
            "Python, PyTorch, Hugging Face Tokenizers, Scikit-Learn",
            "1. Multi-class text classification into: Demo Request, Pricing Inquiry, Technical Question, Complaint, General Info.\n2. Secondary binary classifier for High Urgency vs Normal.\n3. PyTorch inference class returning probabilities and confidence scores.",
            "Phase 3 PyTorch basics",
            "1. Dataset labeling and preprocessing.\n2. Implement PyTorch MLP with embedding layer.\n3. Training loop with early stopping.\n4. Evaluate confusion matrix.",
            "2027-01-25", "Not Started", "Medium", 35.0, 0.0,
            "Model achieves Macro F1 > 0.84 across 5 intent classes on 1,000 test messages.",
            "Unit tests asserting model handles empty strings, emojis, and very long text inputs gracefully.",
            "https://github.com/tasim/customer-intent-classifier", "",
            "Ambiguous multi-intent messages (e.g. asking both about pricing and filing a technical bug).",
            "Understood internal mechanics of PyTorch tensors, autograd, and classification loss functions."
        ),
        (
            "PRJ-004", "Product Knowledge Assistant using RAG",
            "Sales reps and potential buyers struggle to find accurate technical specifications and pricing details buried in 200-page product catalogs.",
            "Phase 6", "Document chunking, vector embeddings, vector databases, hybrid retrieval, citation grounding",
            "Python, FastAPI, pgvector, PostgreSQL, LangChain/LlamaIndex, OpenAI/Gemini Embeddings",
            "1. Automated PDF/Markdown catalog ingestion pipeline.\n2. Semantic chunking with page and section metadata.\n3. Hybrid search (Dense cosine similarity + BM25 keyword search).\n4. Verified citation generation with page number references.",
            "Phase 5 LLM APIs, Phase 6 Vector stores",
            "1. Set up Docker PostgreSQL pgvector.\n2. Chunk company product manuals.\n3. Ingest embeddings.\n4. Build RAG retrieval query pipeline.\n5. Benchmark retrieval precision.",
            "2027-04-20", "Not Started", "High", 40.0, 0.0,
            "Answers factual product questions with 100% citation accuracy; refuses out-of-domain questions with zero hallucination.",
            "Automated test suite using RAGAS asserting Faithfulness > 0.90 and Answer Relevance > 0.88.",
            "https://github.com/tasim/product-knowledge-rag", "",
            "Chunk boundary splitting that separates pricing table headers from price values.",
            "Learned importance of hybrid search for exact product SKU numbers."
        ),
        (
            "PRJ-005", "Tool-Using Autonomous Research Agent",
            "Pre-call prospect research requires manual searching across LinkedIn, Google, company websites, and CRM systems, taking 30 minutes per lead.",
            "Phase 7", "Tool calling schemas, ReAct loop, Pydantic validation, external API consumption",
            "Python, OpenAI Function Calling, Tavily Search API, Pydantic, Requests",
            "1. Custom ReAct reasoning loop in pure Python.\n2. 4 Tools: `search_company_web`, `get_crm_account`, `calculate_market_size`, `save_lead_summary`.\n3. Automated lead dossier generation in structured Markdown format.",
            "Phase 5 Structured Outputs, Phase 7 Tools",
            "1. Define tool schemas with Pydantic.\n2. Implement execution dispatcher.\n3. Build autonomous ReAct loop with max iteration limits.\n4. Output formatted executive briefing.",
            "2027-05-25", "Not Started", "High", 35.0, 0.0,
            "Agent independently executes 3-4 tool calls in sequence to research an unfamiliar company and outputs complete structured lead profile.",
            "Mocked API tests verifying tool call failure recovery and circuit breaking after 5 iterations.",
            "https://github.com/tasim/autonomous-research-agent", "",
            "Infinite loops when LLM cannot find answer from web search results.",
            "Built robust tool parameter validation and error feedback loops."
        ),
        (
            "PRJ-006", "Lead Qualification & BANT Scoring Agent",
            "Inbound leads receive generic follow-ups because sales teams cannot interview every prospect to establish Budget, Authority, Need, and Timing.",
            "Phase 8", "State machines, LangGraph, conversational steering, deterministic scoring algorithms",
            "Python, LangGraph, Pydantic, SQLite persistence",
            "1. Consultative conversation graph that naturally asks qualifying questions.\n2. Dynamic BANT score updater (0-100 points).\n3. Automatic categorization into Hot, Warm, Cold.\n4. SQLite thread state persistence across conversational pauses.",
            "PRJ-004, PRJ-005, LangGraph basics",
            "1. Define StateGraph schema.\n2. Implement qualification nodes.\n3. Build BANT scoring logic.\n4. Add SQLite checkpointer.",
            "2027-06-25", "Not Started", "High", 45.0, 0.0,
            "Agent sustains multi-turn conversation, gathers all 4 BANT criteria without sounding robotic, and calculates accurate qualification score.",
            "Simulated conversation test suite running 20 distinct buyer personas through qualification flow.",
            "https://github.com/tasim/lead-qualification-agent", "",
            "Prospects resisting budget questions or giving evasive answers.",
            "Learned consultative prompting techniques to extract business pain before asking about budget."
        ),
        (
            "PRJ-007", "Autonomous AI Sales Employee with Follow-ups",
            "Over 70% of sales opportunities die from poor follow-up cadence; human reps forget to follow up after the first email or message.",
            "Phase 9", "Multi-touch state machine, background scheduling, email & WhatsApp integration, dynamic message personalization",
            "Python, FastAPI, Celery / Redis, PostgreSQL, SendGrid API, WhatsApp Cloud API",
            "1. Multi-channel messaging (Email + WhatsApp).\n2. Stateful follow-up cadence (Day 1, Day 3, Day 7, Day 14).\n3. Dynamic message adaptation based on lead opens/clicks.\n4. Automatic cadence cancellation when lead replies or books meeting.",
            "PRJ-006, Redis, Celery",
            "1. Build Celery scheduled task worker.\n2. Implement webhook handlers for message replies.\n3. Integrate SendGrid and WhatsApp Cloud APIs.\n4. Test follow-up state transitions.",
            "2027-07-31", "Not Started", "High", 50.0, 0.0,
            "System executes timed follow-up sequences across 10 simulated leads, pauses immediately when a reply is detected, and updates CRM status.",
            "Integration tests verifying webhook reply triggers cancellation of future queued follow-up tasks.",
            "https://github.com/tasim/ai-sales-employee-cadence", "",
            "Deliverability and spam filtering risks with automated email sequences.",
            "Engineered natural conversational variation and human-like delay intervals between touchpoints."
        ),
        (
            "PRJ-008", "AI Price Negotiation & Quotation Generator Assistant",
            "Custom sales quoting takes hours of manual back-and-forth; sales reps often offer unauthorized discounts or make pricing calculation errors.",
            "Phase 9", "Rule-based business guardrails, PDF document generation, payment gateway integration",
            "Python, ReportLab / WeasyPrint, Jinja2, Stripe API, Pydantic",
            "1. Strict negotiation logic adhering to maximum allowable discount tiers.\n2. Dynamic PDF sales quotation generator with branded layout.\n3. Embedded Stripe checkout / deposit payment link.\n4. Audit logging of all negotiated concession terms.",
            "PRJ-006, PRJ-007",
            "1. Program mathematical discount rules.\n2. Design HTML/Jinja2 PDF quote template.\n3. Build Stripe payment intent generator.\n4. Connect quote generation tool to agent.",
            "2027-08-15", "Not Started", "High", 40.0, 0.0,
            "Agent negotiates within authorized bounds, produces a clean, professional PDF quote, and emails it to the buyer with an active payment link.",
            "100 automated adversarial tests confirming the agent never agrees to discounts exceeding business policy.",
            "https://github.com/tasim/ai-negotiation-quotation-engine", "",
            "Adversarial prompt injection attacks where buyers convince the LLM to give 90% discounts.",
            "Enforced strict deterministic code-level price validation outside the LLM context."
        ),
        (
            "PRJ-009", "Collaborative Multi-Agent Sales Team",
            "Complex enterprise sales require specialized roles: SDR for prospecting, Solution Engineer for technical Q&A, and Account Executive for closing.",
            "Phase 8 & 9", "Multi-agent coordination, supervisor patterns, LangGraph, CrewAI",
            "Python, LangGraph, CrewAI, ChromaDB, FastAPI",
            "1. 3 Specialized Autonomous Agents: Prospector Agent, Technical Solution Agent, and Deal Closing Agent.\n2. Supervisor router routing customer inquiries to the appropriate agent.\n3. Shared conversational memory and handover protocols.",
            "PRJ-004 through PRJ-008",
            "1. Define individual agent personas and system prompts.\n2. Implement supervisor routing node in LangGraph.\n3. Build shared conversation state schema.\n4. Run full enterprise sales cycle simulation.",
            "2027-08-31", "Not Started", "Medium", 45.0, 0.0,
            "Multi-agent team collaboratively handles lead from first touch through technical product inquiry to final contract quotation seamlessly.",
            "End-to-end integration tests measuring token efficiency and inter-agent latency.",
            "https://github.com/tasim/multi-agent-sales-team", "",
            "Token explosion and latency compounding across multiple sequential LLM calls.",
            "Optimized state distillation so agents pass concise summaries rather than full conversation histories."
        ),
        (
            "PRJ-010", "Production-Ready AI Sales Platform (Commercial MVP)",
            "Commercial businesses require a secure, multi-tenant, monitored web platform with human-in-the-loop oversight to safely deploy AI sales reps.",
            "Phase 11 & 12", "Full-stack architecture, Docker, FastAPI, PostgreSQL, Redis, Next.js, LangSmith, OWASP Security",
            "Next.js, TypeScript, Tailwind CSS, FastAPI, PostgreSQL (pgvector), Docker, Render/Hetzner, LangSmith",
            "1. Full multi-tenant web platform with live sales dashboard.\n2. Human-in-the-loop approval inbox for high-value quotes and flagged escalations.\n3. Conversation transcript viewer with sentiment analysis.\n4. Dockerized one-click cloud deployment on Render.\n5. Production rate limiting, auth, and OWASP defenses.",
            "All previous projects (PRJ-001 through PRJ-009)",
            "1. Build FastAPI production backend with JWT auth.\n2. Build Next.js operational dashboard.\n3. Write Dockerfile & docker-compose stack.\n4. Deploy to Render with persistent disk & PostgreSQL.\n5. Conduct load test & security audit.",
            "2027-10-15", "Not Started", "High", 70.0, 0.0,
            "Fully working commercial platform deployed online; handles live chats, executes tool calls, allows human intervention, and logs all metrics reliably.",
            "End-to-end Cypress/Playwright frontend tests, Locust load testing (50 concurrent users), and OWASP security vulnerability scan.",
            "https://github.com/tasim/autonomous-ai-sales-platform", "https://sales-agent-demo.render.com",
            "Cold start latency on cloud hosts and managing API key rate limits under peak load.",
            "Built a commercially viable, standalone AI agent SaaS product ready for customer pilots."
        )
    ]

    for idx, p in enumerate(projects, start=5):
        ws.row_dimensions[idx].height = 65
        fill = fill_zebra if idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(p, start=1):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = font_bold if c_idx in [1, 2, 4, 11, 12] else font_data
            cell.fill = fill
            cell.border = border_thin
            
            if c_idx in [1, 4, 10, 11, 12]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c_idx in [13, 14]:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '#,##0.0'
            elif c_idx in [17, 18]:
                cell.alignment = Alignment(horizontal='left', vertical='center')
                if val and str(val).startswith("http"):
                    cell.font = font_link
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    tot_row = len(projects) + 5
    # Total row
    ws.row_dimensions[tot_row].height = 24
    ws.merge_cells(start_row=tot_row, start_column=1, end_row=tot_row, end_column=12)
    c_tot = ws.cell(row=tot_row, column=1, value="TOTAL ESTIMATED EFFORT (HOURS)")
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

    for c in range(15, 21):
        cell = ws.cell(row=tot_row, column=c)
        cell.fill = fill_total
        cell.border = border_double_bottom

    # Validations
    dv_status = DataValidation(type="list", formula1='"Not Started,In Progress,Completed,Blocked,Review"', allow_blank=True)
    ws.add_data_validation(dv_status)
    dv_status.add(f"K5:K{tot_row-1}")

    dv_priority = DataValidation(type="list", formula1='"High,Medium,Low"', allow_blank=True)
    ws.add_data_validation(dv_priority)
    dv_priority.add(f"L5:L{tot_row-1}")

    widths = [11, 25, 28, 12, 25, 25, 28, 16, 28, 12, 13, 11, 12, 12, 28, 26, 24, 24, 25, 25]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.auto_filter.ref = f"A4:T{tot_row-1}"

print("AI Project Backlog module ready.")
