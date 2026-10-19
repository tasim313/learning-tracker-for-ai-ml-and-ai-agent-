import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_sheet_notes(wb, font_family="Segoe UI"):
    ws = wb.create_sheet("Notes and Document Library")
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
    
    border_thin = Border(
        left=Side(style='thin', color='CBD5E0'), right=Side(style='thin', color='CBD5E0'),
        top=Side(style='thin', color='CBD5E0'), bottom=Side(style='thin', color='CBD5E0')
    )

    # Title
    ws.row_dimensions[1].height = 24
    ws.row_dimensions[2].height = 18
    ws['A1'] = "KNOWLEDGE BASE & TECHNICAL DOCUMENT LIBRARY"
    ws['A1'].font = font_title
    ws['A2'] = "Structured Index of Architecture Blueprints, Research Paper Notes, Code Snippets, and Technical Reference Documents"
    ws['A2'].font = font_sub

    headers = [
        "Document ID", "Date", "Topic", "Document Type", "Title",
        "Local File Path", "URL / Reference", "Summary", "Key Concepts",
        "Code Examples / Snippets", "Related Project", "Questions to Research",
        "Next Review Date"
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

    docs = [
        (
            "DOC-001", "2026-11-04", "Python / Architecture", "Architecture Decision",
            "Pydantic V2 State Representation Pattern for Agents",
            "docs/architecture/adr_001_pydantic_state.md", "https://docs.pydantic.dev/latest/",
            "Standardized protocol for agent state dictionaries using typed Pydantic models with field validation.",
            "Immutable state snapshots, TypeAdapter, Field constraints, model_dump(mode='json').",
            "class AgentState(BaseModel):\n  messages: list[ChatMessage]\n  bant_score: int = Field(ge=0, le=100)\n  current_step: str",
            "PRJ-005, PRJ-006", "Performance difference between Pydantic validation and raw TypedDict in high-throughput loops?", "2026-12-01"
        ),
        (
            "DOC-002", "2026-11-10", "Mathematics", "Cheat Sheet",
            "Vector Math & Dot Product Formulas for AI Engineers",
            "notes/math/vector_math_cheatsheet.md", "https://3blue1brown.com",
            "Complete mathematical formulas for Euclidean distance, Dot Product, Cosine Similarity, and Matrix Transpose.",
            "u . v = ||u|| ||v|| cos(theta); Cosine similarity range [-1, 1]; L2 normalization.",
            "def cosine_sim(a, b):\n  return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))",
            "PRJ-004", "How does floating point rounding error affect cosine similarity on 1536-dimensional vectors?", "2026-12-15"
        ),
        (
            "DOC-003", "2026-12-15", "Machine Learning", "Experiment Report",
            "Class Imbalance Handling Strategies in B2B Lead Conversion",
            "experiments/reports/imbalance_lead_conversion.md", "https://scikit-learn.org",
            "Empirical comparison of SMOTE oversampling vs Balanced Random Forest vs class_weight='balanced'.",
            "Precision-recall trade-off; Cost-sensitive matrix: Missing a $10k deal costs 50x more than an unnecessary sales call.",
            "clf = RandomForestClassifier(class_weight={0: 1, 1: 25}, random_state=42)",
            "PRJ-002", "What is the optimal classification threshold when sales rep capacity is limited to 20 calls/day?", "2027-01-10"
        ),
        (
            "DOC-004", "2027-01-20", "Deep Learning", "Paper Summary",
            "Summary: Attention Is All You Need (Vaswani et al. 2017)",
            "notes/papers/attention_is_all_you_need_summary.md", "https://arxiv.org/abs/1706.03762",
            "Deconstruction of self-attention mechanisms, multi-head attention, positional encoding, and layer normalization.",
            "Queries, Keys, Values; Scaled dot product avoids vanishing gradients when d_k is large; Parallel training vs RNN sequential bottleneck.",
            "def attention(q, k, v, mask=None):\n  scores = (q @ k.transpose(-2, -1)) / math.sqrt(q.size(-1))\n  if mask: scores.masked_fill_(mask == 0, -1e9)\n  return F.softmax(scores, dim=-1) @ v",
            "PRJ-003", "Why did modern LLMs switch from Post-LN (original paper) to Pre-LN or RMSNorm?", "2027-02-15"
        ),
        (
            "DOC-005", "2027-03-05", "Prompting", "Code Snippet",
            "Production Structured Output Extraction with OpenAI SDK",
            "snippets/llm/structured_output_helper.py", "https://platform.openai.com/docs/guides/structured-outputs",
            "Production-ready wrapper enforcing strict JSON schema adherence with automatic Pydantic parsing.",
            "response_format=PydanticModel, strict=True, system message conditioning, temperature=0.0 for zero extraction variance.",
            "completion = client.beta.chat.completions.parse(\n  model='gpt-4o-mini',\n  messages=[{'role': 'user', 'content': text}],\n  response_format=BANTLeadScore\n)",
            "PRJ-005, PRJ-006", "What is the token overhead of OpenAI's strict JSON schema constrained decoding?", "2027-04-01"
        ),
        (
            "DOC-006", "2027-04-15", "RAG", "Architecture Decision",
            "Enterprise Hybrid Search Architecture with PostgreSQL pgvector",
            "docs/architecture/adr_002_pgvector_hybrid_search.md", "https://github.com/pgvector/pgvector",
            "Combining PostgreSQL full-text search (tsvector/BM25) with dense vector HNSW cosine similarity in a single query.",
            "Reciprocal Rank Fusion (RRF), HNSW indexing parameters (m=16, ef_construction=64), single-database operational simplicity.",
            "SELECT id, content, (0.7 * (1 - (embedding <=> query_vector)) + 0.3 * ts_rank_cd(textsearch, query)) AS score FROM product_docs ORDER BY score DESC LIMIT 5;",
            "PRJ-004", "How often must HNSW index be rebuilt when adding 1,000 new product catalog rows per day?", "2027-05-01"
        ),
        (
            "DOC-007", "2027-05-15", "AI Agents", "Cheat Sheet",
            "ReAct Loop Pattern: State Machine vs Free-Form Loop",
            "notes/agents/react_loop_patterns.md", "https://langchain-ai.github.io/langgraph/",
            "Comparison of unconstrained while-loop ReAct vs deterministic state machine graphs for business automation.",
            "Deterministic State Graphs prevent infinite loops, enable persistent checkpoints, and simplify human-in-the-loop gates.",
            "workflow = StateGraph(SalesState)\nworkflow.add_node('qualify', qualify_node)\nworkflow.add_conditional_edges('qualify', route_lead)",
            "PRJ-006, PRJ-007", "How to dynamically inject user interruptions into an active agent multi-tool reasoning sequence?", "2027-06-01"
        ),
        (
            "DOC-008", "2027-06-20", "AI Agents", "Architecture Decision",
            "Autonomous Negotiation Guardrails & Concession Curves",
            "docs/architecture/adr_003_negotiation_guardrails.md", "https://github.com/tasim/sales-agent",
            "Strict deterministic rules preventing autonomous AI sales reps from violating pricing floors.",
            "Hard concession ceilings (max 15% discount), margin validation, manager approval interrupts, audit trail logging.",
            "def calculate_discount(margin, requested):\n  if requested > 0.15: return trigger_human_review()\n  return min(requested, margin * 0.4)",
            "PRJ-008", "What fallback copy should the agent say when customer insists on a 25% discount?", "2027-07-15"
        ),
        (
            "DOC-009", "2027-08-25", "Fine-Tuning", "Experiment Report",
            "LoRA Rank (r) & Alpha Optimization for Objection Handling",
            "experiments/reports/lora_rank_hyperparameters.md", "https://github.com/unslothai/unsloth",
            "Benchmarked r=8, r=16, r=32 across 300 sales objection training pairs on Llama-3-8B.",
            "r=16 with alpha=32 provided optimal balance of style adaptation and zero catastrophic forgetting of factual knowledge.",
            "peft_config = LoraConfig(r=16, lora_alpha=32, target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj'])",
            "PRJ-009", "Does QLoRA 4-bit quantization affect conversational nuance in consultative sales?", "2027-09-15"
        ),
        (
            "DOC-010", "2027-09-25", "Production", "Cheat Sheet",
            "OWASP Top 10 for LLMs: Defensive Implementation Checklist",
            "notes/security/owasp_llm_defenses.md", "https://owasp.org",
            "Tactical defensive rules: System prompt boundary tags, tool parameter regex sanitization, output guardrails.",
            "LLM01 Prompt Injection, LLM02 Insecure Output, LLM06 Excessive Agency, LLM08 Denial of Service.",
            "def sanitize_input(user_prompt: str) -> str:\n  if any(w in user_prompt.lower() for w in ['ignore previous instructions', 'system override']):\n    raise SecurityException('Suspicious prompt pattern detected')",
            "PRJ-010", "How to defend against indirect prompt injection hidden inside customer-submitted website links?", "2027-10-15"
        )
    ]

    for idx, d in enumerate(docs, start=5):
        ws.row_dimensions[idx].height = 45
        fill = fill_zebra if idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(d, start=1):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = font_bold if c_idx in [1, 4, 5, 11] else font_data
            cell.fill = fill
            cell.border = border_thin
            
            if c_idx in [1, 2, 4, 11, 13]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c_idx == 7:
                cell.alignment = Alignment(horizontal='left', vertical='center')
                if val and str(val).startswith("http"):
                    cell.font = font_link
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    tot_row = len(docs) + 5
    widths = [12, 12, 18, 18, 28, 26, 24, 30, 28, 30, 16, 26, 13]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.auto_filter.ref = f"A4:M{tot_row-1}"

print("Notes and Document Library module ready.")
