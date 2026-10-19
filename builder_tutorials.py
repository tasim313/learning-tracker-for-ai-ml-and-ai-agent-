import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

def build_sheet_tutorials(wb, font_family="Segoe UI"):
    ws = wb.create_sheet("Tutorial and Course Tracker")
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
    ws['A1'] = "TUTORIAL, COURSE & PAPER STUDY TRACKER"
    ws['A1'].font = font_title
    ws['A2'] = "Tracking Guided Learning: Videos, Courses, Interactive Labs, and Research Papers with Enforced Practical Deliverables"
    ws['A2'].font = font_sub

    headers = [
        "Tutorial ID", "Title", "Provider", "URL", "Subject", "Difficulty",
        "Format", "Estimated Duration (hrs)", "Actual Duration (hrs)",
        "Start Date", "Completion Date", "Current Status", "Important Lessons",
        "Exercises Completed", "Personal Rating (1-5)", "Notes"
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

    tutorials = [
        ("TUT-001", "Python for Everybody Specialization", "Coursera / Dr. Chuck", "https://www.py4e.com/", "Python", "Beginner", "Course", 20.0, 0.0, "2026-11-01", "", "Not Started", "Data structures, web scraping, SQL databases, and JSON APIs in Python.", "Exercises 1-10 completed", None, "Review Python fundamentals and clean design patterns."),
        ("TUT-002", "Essence of Linear Algebra", "3Blue1Brown", "https://www.3blue1brown.com/topics/linear-algebra", "Mathematics", "Beginner", "Video Series", 6.0, 0.0, "2026-11-05", "", "Not Started", "Geometric intuition behind matrices as linear transformations and eigenvectors.", "Visualized matrix transforms in Python", None, "Must-watch visual series to deeply understand dot products and projections."),
        ("TUT-003", "Google Machine Learning Crash Course", "Google", "https://developers.google.com/machine-learning/crash-course", "Machine Learning", "Beginner to Intermediate", "Interactive Course", 15.0, 0.0, "2026-12-01", "", "Not Started", "Gradient descent, loss surfaces, classification metrics, and regularization.", "All Colab programming exercises", None, "High quality visual explanations of machine learning principles."),
        ("TUT-004", "Deep Learning with PyTorch: A 60 Minute Blitz", "PyTorch Official", "https://pytorch.org/tutorials/beginner/deep_learning_60min_blitz.html", "Deep Learning", "Intermediate", "Hands-on Lab", 4.0, 0.0, "2027-01-02", "", "Not Started", "Tensors, autograd engine, building neural networks with nn.Module, and optimizers.", "Built and trained mini CNN on CIFAR-10", None, "Official PyTorch onboarding module. Short, dense, and effective."),
        ("TUT-005", "Neural Networks: Zero to Hero (micrograd & makemore)", "Andrej Karpathy", "https://karpathy.ai/zero-to-hero.html", "Deep Learning", "Intermediate", "Video / Code-along", 16.0, 0.0, "2027-01-10", "", "Not Started", "Built autograd engine from scratch, backprop math, and character-level language models.", "Implemented micrograd engine in Python", None, "The gold standard for demystifying backpropagation and neural net training."),
        ("TUT-006", "Hugging Face Transformers Course (Chapters 1-4)", "Hugging Face", "https://huggingface.co/learn/nlp-course", "LLMs & NLP", "Intermediate", "Interactive Course", 12.0, 0.0, "2027-02-02", "", "Not Started", "Tokenizers, pipelines, attention mechanisms, and fine-tuning with Trainer.", "Fine-tuned text classifier on customer tickets", None, "Essential practical grounding for open-source LLM manipulation."),
        ("TUT-007", "Attention Is All You Need (Paper Walkthrough)", "Vaswani et al. / Jay Alammar", "https://jalammar.github.io/illustrated-transformer/", "LLMs", "Intermediate to Advanced", "Paper & Visual Guide", 5.0, 0.0, "2027-02-10", "", "Not Started", "Scaled dot-product attention equation, query-key-value transformations, positional encodings.", "Annotated Transformer architecture diagram", None, "Foundational paper that launched modern Generative AI."),
        ("TUT-008", "ChatGPT Prompt Engineering for Developers", "DeepLearning.AI / OpenAI", "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/", "Prompting", "Beginner", "Short Course", 2.0, 0.0, "2027-03-02", "", "Not Started", "System messages, delimiters, structured JSON extraction, and iterative prompt design.", "Built lead data extraction prompts in Jupyter", None, "Taught by Isa Fulford (OpenAI) and Andrew Ng."),
        ("TUT-009", "Building Systems with the ChatGPT API", "DeepLearning.AI / OpenAI", "https://www.deeplearning.ai/short-courses/building-systems-with-chatgpt/", "LLM Systems", "Intermediate", "Short Course", 2.5, 0.0, "2027-03-08", "", "Not Started", "Chaining prompts, moderation API, input evaluation, and user interaction loops.", "Built multi-step customer service bot", None, "Focuses on safety and evaluating system outputs."),
        ("TUT-010", "LangGraph: Developing Multi-Agent Applications", "LangChain Academy", "https://academy.langchain.com/", "AI Agents", "Intermediate to Advanced", "Course / Labs", 10.0, 0.0, "2027-05-02", "", "Not Started", "StateGraph, cyclical agent loops, persistence checkpoints, and conditional routing.", "Built stateful research agent with human-in-the-loop", None, "The definitive course on reliable agentic architecture."),
        ("TUT-011", "Functions, Tools and Agents with LangChain", "DeepLearning.AI / Harrison Chase", "https://www.deeplearning.ai/short-courses/functions-tools-agents-langchain/", "AI Agents", "Intermediate", "Short Course", 3.0, 0.0, "2027-05-12", "", "Not Started", "OpenAI function calling, tool binding, routing, and ReAct agent workflows.", "Created agent invoking weather and CRM tools", None, "Excellent practical introduction to function calling."),
        ("TUT-012", "Building Agentic RAG with LlamaIndex", "DeepLearning.AI / Jerry Liu", "https://www.deeplearning.ai/short-courses/building-agentic-rag-with-llamaindex/", "RAG & Agents", "Intermediate", "Short Course", 3.0, 0.0, "2027-06-02", "", "Not Started", "Router engines, sub-question query planning, and tool-augmented document retrieval.", "Built router querying both SQL DB and vector docs", None, "Bridges document retrieval with agentic decision-making."),
        ("TUT-013", "Multi AI Agent Systems with crewAI", "DeepLearning.AI / João Moura", "https://www.deeplearning.ai/short-courses/multi-ai-agent-systems-with-crewai/", "Multi-Agent", "Intermediate", "Short Course", 3.0, 0.0, "2027-06-15", "", "Not Started", "Crew orchestration, agent roles, task delegation, and memory management.", "Built SDR research and pitch-writing crew", None, "Great for understanding cooperative multi-agent dynamics."),
        ("TUT-014", "Fine-Tuning Large Language Models", "DeepLearning.AI / Sharon Zhou", "https://www.deeplearning.ai/short-courses/finetuning-large-language-models/", "Fine-Tuning", "Advanced", "Short Course", 3.5, 0.0, "2027-08-18", "", "Not Started", "Instruction tuning, data preparation, evaluation benchmarks, and LoRA parameters.", "Prepared instruction dataset and ran fine-tuning script", None, "Solid conceptual and code walkthrough of parameter-efficient tuning."),
        ("TUT-015", "FastAPI in 100 Seconds & Full Crash Course", "freeCodeCamp / Tiangolo", "https://fastapi.tiangolo.com/tutorial/", "Backend", "Intermediate", "Documentation & Video", 6.0, 0.0, "2027-09-18", "", "Not Started", "Pydantic request bodies, dependency injection, async def, and CORS middleware.", "Deployed authenticated REST API with Swagger UI", None, "Essential for wrapping AI models in high-throughput production APIs."),
        ("TUT-016", "Docker for Developers", "freeCodeCamp / TechWorld with Nana", "https://www.youtube.com/watch?v=3c-iBn73dDE", "DevOps", "Intermediate", "Video & Hands-on", 5.0, 0.0, "2027-09-24", "", "Not Started", "Container isolation, volumes, networks, Dockerfiles, and multi-container Docker Compose.", "Containerized FastAPI app with Postgres and Redis", None, "Crucial for reliable deployments on Render and Hetzner.")
    ]

    for idx, t in enumerate(tutorials, start=5):
        ws.row_dimensions[idx].height = 26
        fill = fill_zebra if idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(t, start=1):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = font_bold if c_idx in [1, 2, 5, 12] else font_data
            cell.fill = fill
            cell.border = border_thin
            
            if c_idx in [1, 3, 5, 6, 7, 10, 11, 12, 15]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c_idx in [8, 9]:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '#,##0.0'
            elif c_idx == 4:
                cell.alignment = Alignment(horizontal='left', vertical='center')
                if val and str(val).startswith("http"):
                    cell.font = font_link
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    tot_row = len(tutorials) + 5
    # Total row
    ws.row_dimensions[tot_row].height = 24
    ws.merge_cells(start_row=tot_row, start_column=1, end_row=tot_row, end_column=7)
    c_tot = ws.cell(row=tot_row, column=1, value="TOTAL TUTORIAL HOURS")
    c_tot.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_tot.alignment = Alignment(horizontal='right', vertical='center')
    c_tot.fill = fill_total
    for c in range(1, 8):
        ws.cell(row=tot_row, column=c).border = border_double_bottom
        ws.cell(row=tot_row, column=c).fill = fill_total

    c_plan = ws.cell(row=tot_row, column=8, value=f"=SUM(H5:H{tot_row-1})")
    c_plan.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_plan.fill = fill_total
    c_plan.border = border_double_bottom
    c_plan.alignment = Alignment(horizontal='right', vertical='center')
    c_plan.number_format = '#,##0.0'

    c_act = ws.cell(row=tot_row, column=9, value=f"=SUM(I5:I{tot_row-1})")
    c_act.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_act.fill = fill_total
    c_act.border = border_double_bottom
    c_act.alignment = Alignment(horizontal='right', vertical='center')
    c_act.number_format = '#,##0.0'

    for c in range(10, 17):
        cell = ws.cell(row=tot_row, column=c)
        cell.fill = fill_total
        cell.border = border_double_bottom

    # Validations
    dv_status = DataValidation(type="list", formula1='"Not Started,In Progress,Completed,Skipped"', allow_blank=True)
    ws.add_data_validation(dv_status)
    dv_status.add(f"L5:L{tot_row-1}")

    dv_rating = DataValidation(type="list", formula1='"1,2,3,4,5"', allow_blank=True)
    ws.add_data_validation(dv_rating)
    dv_rating.add(f"O5:O{tot_row-1}")

    widths = [12, 28, 18, 24, 16, 14, 14, 12, 12, 12, 12, 14, 28, 25, 12, 24]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.auto_filter.ref = f"A4:P{tot_row-1}"

print("Tutorial Tracker module ready.")
