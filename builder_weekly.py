import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

def build_sheet_weekly(wb, font_family="Segoe UI"):
    ws = wb.create_sheet("Weekly Review and Analysis")
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
    ws['A1'] = "WEEKLY LEARNING RETROSPECTIVE & GAP ANALYSIS"
    ws['A1'].font = font_title
    ws['A2'] = "12-Week Honest Performance Review: Measuring Study Discipline, Weak Concepts, Inefficiencies, and Actionable Adjustments"
    ws['A2'].font = font_sub

    headers = [
        "Week Starting", "Week #", "Planned Hours", "Actual Hours",
        "Topics Planned", "Topics Completed", "Exercises Done", "Projects Advanced",
        "Assessment Avg (%)", "Skills Improved", "Strongest Topics", "Weakest Topics",
        "Blockers Encountered", "Time Wasted / Inefficiencies", "Key Lessons Learned",
        "Next Week Goals & Schedule Adjustments", "Overall Confidence (1-5)"
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

    weeks_data = [
        ("2026-11-01", "Week 01", 16.0, 0.0, 5, 0, "Async HTTP client, Vector dot products", "Dev environment setup & testing suite", None, "Python type hints, matrix geometry", "Python OOP, basic algebra", "Eigenvalues, async event loops", "None", "Spent 1.5h tweaking VS Code themes instead of coding", "Write tests before implementing business logic.", "Master gradient descent and start Pandas.", 3),
        ("2026-11-08", "Week 02", 17.5, 0.0, 5, 0, "Gradient descent loop, NumPy matrix drills", "Scratch math repository", None, "Optimization math, vectorized arrays", "Gradient descent intuition", "Partial derivatives chain rule", "Math notation confusion", "Passive reading of math blogs without writing formulas by hand", "Work through calculus examples on paper first.", "Deep dive into Pandas data wrangling.", 3),
        ("2026-11-15", "Week 03", 16.0, 0.0, 4, 0, "Pandas aggregation, data cleaning scripts", "Project 1: Sales Data Analysis", None, "Data hygiene, outlier detection", "Pandas filtering, Matplotlib heatmaps", "Datetime parsing edge cases", "Dirty CSV date formats", "Overcomplicating data visualization layout", "Vectorized Pandas operations are 100x faster than loops.", "Complete Project 1 executive report.", 4),
        ("2026-11-22", "Week 04", 18.0, 0.0, 5, 0, "RFM segmentation, Logistic Regression scratch", "Project 1 & Project 2 setup", None, "RFM customer segmentation, Scikit-learn", "Classification intuition", "Log-odds mathematical interpretation", "Missing CRM values", "Debugging Scikit-Learn pipeline column types", "Always check feature types with df.info() before fitting.", "Train XGBoost model for customer prediction.", 3),
        ("2026-11-29", "Week 05", 16.0, 0.0, 4, 0, "Decision trees, Random Forest, XGBoost", "Project 2: Customer Purchase Predictor", None, "Tree ensembles, ROC-AUC evaluation", "Feature importance interpretation", "Class imbalance hyperparameter tuning", "High class imbalance (97% negative)", "Searching StackOverflow blindly instead of reading docs", "Use Precision-Recall curve when classes are highly skewed.", "Complete Project 2 GitHub submission.", 4),
        ("2026-12-06", "Week 06", 17.0, 0.0, 4, 0, "K-Means clustering, PCA dimensionality reduction", "Project 2 tuning & Project 3 setup", None, "Unsupervised learning, clustering", "K-Means elbow method", "PCA variance interpretation", "Sparse feature matrices", "Spent 2 hours rewriting working clustering algorithm", "Start with Scikit-learn baseline before writing custom code.", "Begin PyTorch deep learning blitz.", 3),
        ("2026-12-13", "Week 07", 18.0, 0.0, 4, 0, "PyTorch tensors, autograd backwards pass", "Project 3: Intent Classifier", None, "PyTorch tensor operations, CUDA setup", "Autograd computation graphs", "Tensor dimension broadcasting rules", "CUDA out-of-memory errors on GPU", "Debugging shape mismatch errors without printing tensor.shape", "Always write assert tensor.shape == (B, C, H, W) before operations.", "Train multi-layer perceptron in PyTorch.", 3),
        ("2026-12-20", "Week 08", 16.5, 0.0, 4, 0, "PyTorch MLP, custom Dataset, AdamW optimizer", "Project 3: Intent Classifier", None, "Neural network training loops, early stopping", "Loss function selection", "Learning rate scheduling", "Overfitting on small training set", "Letting model train 50 epochs after validation loss plateaus", "Implement early stopping based on validation loss.", "Tokenization and Transformer attention mechanism.", 4),
        ("2026-12-27", "Week 09", 16.0, 0.0, 3, 0, "BPE tokenization, self-attention PyTorch module", "Transformer scratch notebook", None, "Scaled dot-product attention math", "Tokenization economics, tiktoken", "Multi-head attention tensor reshaping", "Causal attention masking logic", "Struggled with matrix dimensions in attention layer", "Self-attention is simply a weighted average of values by query-key similarity.", "Prompt engineering and structured outputs.", 4),
        ("2027-01-03", "Week 10", 17.0, 0.0, 4, 0, "Pydantic structured output, OpenAI API wrapper", "BANT extraction pipeline", None, "Constrained JSON decoding, prompt defense", "Deterministic schema extraction", "Rate limit exponential backoffs", "API 429 rate limit exceptions", "Writing complex regex parsers instead of using native structured outputs", "Use official response_format=json_schema; never parse JSON with regex.", "Embeddings, vector databases, and RAG.", 4),
        ("2027-01-10", "Week 11", 18.0, 0.0, 4, 0, "pgvector setup, semantic chunking pipeline", "Project 4: Product Knowledge Assistant", None, "Vector indexing, cosine search, hybrid retrieval", "pgvector SQL integration", "BM25 keyword search tuning", "Chunking table data in PDF documents", "Trying to chunk PDFs without extracting markdown structure", "Clean markdown conversion is 80% of RAG retrieval success.", "AI Agent tool calling and LangGraph state loops.", 4),
        ("2027-01-17", "Week 12", 18.0, 0.0, 4, 0, "ReAct agent loop, tool execution dispatcher", "Project 5 & Project 6 setup", None, "Agent reasoning loops, tool calling schemas", "Function calling with Pydantic", "Handling tool execution failure gracefully", "LLM hallucinating tool arguments", "Vague tool docstrings causing LLM confusion", "Tool parameter docstrings must be as clear and precise as human API documentation.", "Build multi-agent sales qualification workflow.", 4)
    ]

    for idx, w in enumerate(weeks_data, start=5):
        ws.row_dimensions[idx].height = 42
        fill = fill_zebra if idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(w, start=1):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = font_bold if c_idx in [1, 2, 8, 17] else font_data
            cell.fill = fill
            cell.border = border_thin
            
            if c_idx in [1, 2, 5, 6, 17]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c_idx in [3, 4]:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '#,##0.0'
            elif c_idx == 9:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '0%'
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    tot_row = len(weeks_data) + 5
    # Total row
    ws.row_dimensions[tot_row].height = 24
    ws.merge_cells(start_row=tot_row, start_column=1, end_row=tot_row, end_column=2)
    c_tot = ws.cell(row=tot_row, column=1, value="TOTAL PLANNED HOURS")
    c_tot.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_tot.alignment = Alignment(horizontal='right', vertical='center')
    c_tot.fill = fill_total
    for c in range(1, 3):
        ws.cell(row=tot_row, column=c).border = border_double_bottom
        ws.cell(row=tot_row, column=c).fill = fill_total

    c_plan = ws.cell(row=tot_row, column=3, value=f"=SUM(C5:C{tot_row-1})")
    c_plan.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_plan.fill = fill_total
    c_plan.border = border_double_bottom
    c_plan.alignment = Alignment(horizontal='right', vertical='center')
    c_plan.number_format = '#,##0.0'

    c_act = ws.cell(row=tot_row, column=4, value=f"=SUM(D5:D{tot_row-1})")
    c_act.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_act.fill = fill_total
    c_act.border = border_double_bottom
    c_act.alignment = Alignment(horizontal='right', vertical='center')
    c_act.number_format = '#,##0.0'

    for c in range(5, 18):
        cell = ws.cell(row=tot_row, column=c)
        cell.fill = fill_total
        cell.border = border_double_bottom

    # Validations
    dv_conf = DataValidation(type="list", formula1='"1,2,3,4,5"', allow_blank=True)
    ws.add_data_validation(dv_conf)
    dv_conf.add(f"Q5:Q{tot_row-1}")

    widths = [13, 10, 13, 13, 13, 14, 25, 25, 16, 25, 22, 24, 24, 25, 25, 26, 15]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.auto_filter.ref = f"A4:Q{tot_row-1}"

print("Weekly Review module ready.")
