import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

def build_sheet_agenda(wb, font_family="Segoe UI"):
    ws = wb.create_sheet("Daily Study Agenda")
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
    ws['A1'] = "30-DAY DAILY STUDY & EXECUTION AGENDA"
    ws['A1'].font = font_title
    ws['A2'] = "Enforced 2–3 Hour Daily Protocol: 45m Concepts • 60m Coding Drills • 60m Project Building • 15m Review & Documentation"
    ws['A2'].font = font_sub

    headers = [
        "Date", "Day #", "Learning Objective", "Planned Activities (Time-Blocked)",
        "Resource Links", "Planned Minutes", "Actual Minutes", "Deliverable",
        "Status", "Problems Encountered", "Next Action"
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

    agenda_days = [
        ("2026-11-01", "Day 01", "Python OOP & Type Hinting Discipline", "45m: Review Python 3.11 typing module.\n60m: Code custom BaseModel with typing.\n60m: Project setup & repo architecture.\n15m: Update notes and log difficulties.", "RES-017", 180, 0, "Git repo with poetry, pytest, typing test cases", "Not Started", "", ""),
        ("2026-11-02", "Day 02", "AsyncIO & Non-blocking Network Calls", "45m: Read AsyncIO event loop docs.\n60m: Build async scraper fetching 10 mock pages.\n60m: Project: Async CRM client mock.\n15m: Reflection and time audit.", "RES-017, RES-022", 180, 0, "Working async worker script with concurrency benchmark", "Not Started", "", ""),
        ("2026-11-03", "Day 03", "JSON Serialization & Pydantic Validation", "45m: Study Pydantic V2 core concepts.\n60m: Code nested data validators.\n60m: Project: Lead profile schema validator.\n15m: Review and document edge cases.", "RES-007, RES-017", 180, 0, "Pydantic LeadProfile class with phone/email validation", "Not Started", "", ""),
        ("2026-11-04", "Day 04", "Linear Algebra: Vector Dot Products", "45m: Watch 3Blue1Brown Linear Algebra.\n60m: Code vector dot product & norm from scratch.\n60m: Compute cosine similarity between 3 text vectors.\n15m: Review notes on projections.", "RES-018", 180, 0, "Python vector math utility file with unit tests", "Not Started", "", ""),
        ("2026-11-05", "Day 05", "Linear Algebra: Matrix Transformations", "45m: Study matrix multiply & transformation geometry.\n60m: Write matrix multiply function in pure Python.\n60m: Benchmark vs NumPy array operations.\n15m: Log lessons learned.", "RES-018", 180, 0, "Jupyter notebook visualizing 2D matrix shear & rotate", "Not Started", "", ""),
        ("2026-11-06", "Day 06", "Probability: Bayes' Theorem in Sales", "45m: Study conditional probability & Bayes rule.\n60m: Write Bayes calculation function.\n60m: Project: Model lead conversion odds based on source.\n15m: Record quiz questions.", "RES-001", 180, 0, "Probabilistic lead scoring function with test cases", "Not Started", "", ""),
        ("2026-11-07", "Day 07", "Weekly Review 1 & Rest / Catch-up", "60m: Review Days 1-6 concepts.\n60m: Refactor code and commit all repos.\n30m: Fill out Weekly Review Worksheet.", "Weekly Review Sheet", 150, 0, "Completed Weekly Review 1 & clean GitHub commits", "Not Started", "", ""),
        ("2026-11-08", "Day 08", "Calculus: Derivatives & Loss Functions", "45m: Derivatives, gradients, and partial derivatives.\n60m: Code manual derivative calculation.\n60m: Implement Mean Squared Error (MSE) loss function.\n15m: Summary.", "RES-001", 180, 0, "Python notebook calculating analytic & numerical gradients", "Not Started", "", ""),
        ("2026-11-09", "Day 09", "Optimization: Gradient Descent from Scratch", "45m: Study batch vs stochastic gradient descent.\n60m: Write gradient descent loop finding minimum.\n60m: Plot descent trajectory across learning rates.\n15m: Document overshoot risks.", "RES-001", 180, 0, "Working 2D gradient descent optimizer visualization", "Not Started", "", ""),
        ("2026-11-10", "Day 10", "NumPy Vectorization & Broadcasting", "45m: Study NumPy memory layout and broadcasting rules.\n60m: Solve 15 array manipulation exercises.\n60m: Vectorize sales transaction table processing.\n15m: Log performance stats.", "RES-018", 180, 0, "Benchmarked NumPy vectorized functions vs Python loops", "Not Started", "", ""),
        ("2026-11-11", "Day 11", "Pandas DataFrames: Filtering & Aggregation", "45m: Read Pandas user guide on indexing and groupby.\n60m: Perform complex queries on 10k sales records.\n60m: Calculate monthly sales velocity by segment.\n15m: Note syntax gotchas.", "RES-019", 180, 0, "Pandas data wrangling script producing cohort summary", "Not Started", "", ""),
        ("2026-11-12", "Day 12", "Exploratory Data Analysis: Outliers & Missing Values", "45m: Study data hygiene and imputation strategies.\n60m: Write automated missing data detection script.\n60m: Impute median values and flag anomalies.\n15m: Document data leakage traps.", "RES-002, RES-019", 180, 0, "Reusable data cleaning function with logging", "Not Started", "", ""),
        ("2026-11-13", "Day 13", "Data Visualization with Matplotlib & Seaborn", "45m: Study statistical chart types and design rules.\n60m: Code correlation heatmap and boxplots.\n60m: Project 1: Plot sales deal size distributions.\n15m: Review visual clarity.", "RES-019", 180, 0, "Clean 4-panel sales exploratory visualization figure", "Not Started", "", ""),
        ("2026-11-14", "Day 14", "Weekly Review 2 & Project 1 Sprint", "60m: Code review for Project 1.\n60m: Finalize Project 1 analysis markdown report.\n30m: Fill out Weekly Review Worksheet.", "Weekly Review Sheet", 150, 0, "Completed Weekly Review 2 & Project 1 draft report", "Not Started", "", ""),
        ("2026-11-15", "Day 15", "Supervised Learning: Linear Regression Math", "45m: Study OLS equations, assumptions, and residuals.\n60m: Code simple linear regression from scratch.\n60m: Compare scratch model against Scikit-Learn.\n15m: Check R^2 and MSE metrics.", "RES-016", 180, 0, "Scratch linear regression implementation notebook", "Not Started", "", ""),
        ("2026-11-16", "Day 16", "Logistic Regression & Sigmoid Activation", "45m: Study log-odds, sigmoid curve, and binary cross-entropy.\n60m: Code sigmoid and log-loss function in Python.\n60m: Train Scikit-Learn LogisticRegression on lead data.\n15m: Log weights.", "RES-016", 180, 0, "Trained binary classifier with probability outputs", "Not Started", "", ""),
        ("2026-11-17", "Day 17", "Evaluation Metrics: Precision, Recall & ROC-AUC", "45m: Confusion matrix, precision, recall, F1, and AUC.\n60m: Write custom confusion matrix calculator.\n60m: Plot Precision-Recall curve and choose cutoff.\n15m: Reflection.", "RES-016", 180, 0, "Precision-recall analysis script with cost function", "Not Started", "", ""),
        ("2026-11-18", "Day 18", "Decision Trees & Gini Impurity", "45m: Study decision tree splits and impurity formulas.\n60m: Calculate Gini impurity by hand for a split.\n60m: Train DecisionTreeClassifier and export visual tree.\n15m: Document depth tuning.", "RES-016", 180, 0, "Visual decision tree graphic and feature importance table", "Not Started", "", ""),
        ("2026-11-19", "Day 19", "Random Forests & Bagging Ensembles", "45m: Study ensemble theory, bootstrap aggregating, OOB score.\n60m: Train RandomForest on customer churn dataset.\n60m: Extract and interpret top-10 predictive features.\n15m: Log findings.", "RES-016", 180, 0, "Random Forest model with cross-validation report", "Not Started", "", ""),
        ("2026-11-20", "Day 20", "Gradient Boosting with XGBoost", "45m: Study boosting vs bagging and residual fitting.\n60m: Install and train XGBClassifier on sales data.\n60m: Project 2: Customer Purchase Prediction model.\n15m: Log AUC gains.", "RES-016", 180, 0, "XGBoost baseline classifier achieving ROC-AUC > 0.82", "Not Started", "", ""),
        ("2026-11-21", "Day 21", "Weekly Review 3 & Hyperparameter Tuning", "60m: RandomizedSearchCV hyperparameter search.\n60m: Validate model on out-of-time test split.\n30m: Fill out Weekly Review Worksheet.", "Weekly Review Sheet", 150, 0, "Completed Weekly Review 3 & tuned XGBoost model", "Not Started", "", ""),
        ("2026-11-22", "Day 22", "Unsupervised Learning: K-Means Clustering", "45m: Study K-Means centroid updates and elbow method.\n60m: Code K-Means from scratch in pure Python.\n60m: Cluster customer accounts by purchase frequency.\n15m: Log centroid stats.", "RES-016", 180, 0, "Customer clustering notebook with 4 distinct clusters", "Not Started", "", ""),
        ("2026-11-23", "Day 23", "Dimensionality Reduction: PCA", "45m: Study covariance matrix, eigenvalues, and variance.\n60m: Run PCA to reduce 20 CRM features to 2 components.\n60m: Plot 2D scatter plot colored by customer tier.\n15m: Review math.", "RES-016", 180, 0, "PCA 2D projection scatter plot with explained variance", "Not Started", "", ""),
        ("2026-11-24", "Day 24", "Scikit-Learn Pipelines & Model Export", "45m: Study ColumnTransformer and Pipeline architecture.\n60m: Build end-to-end preprocessing + model pipeline.\n60m: Save pipeline with joblib and test inference call.\n15m: Log latency.", "RES-016", 180, 0, "Exported `lead_scoring_pipeline.joblib` with inference test", "Not Started", "", ""),
        ("2026-11-25", "Day 25", "Project 2 Finalization: Customer Purchase Predictor", "45m: Review model evaluation metrics against acceptance criteria.\n60m: Write comprehensive README and usage script.\n60m: Push code to GitHub repository.\n15m: Self-assessment.", "RES-016", 180, 0, "GitHub repo for Project 2 with automated evaluation", "Not Started", "", ""),
        ("2026-11-26", "Day 26", "PyTorch Foundations: Tensors & Autograd", "45m: Study PyTorch tensor memory & autograd graph.\n60m: Write custom autograd function with backward pass.\n60m: Train a 1-neuron model using autograd.\n15m: Review tensor shapes.", "RES-014", 180, 0, "PyTorch tensor drill notebook with autograd tests", "Not Started", "", ""),
        ("2026-11-27", "Day 27", "PyTorch Neural Networks: nn.Module & Layers", "45m: Study nn.Linear, ReLU, and forward() method.\n60m: Build 3-layer MLP classifying synthetic customer data.\n60m: Write full training loop with loss logging.\n15m: Plot training curve.", "RES-014", 180, 0, "PyTorch MLP model script training cleanly without NaNs", "Not Started", "", ""),
        ("2026-11-28", "Day 28", "PyTorch Dataset & DataLoader Pipelines", "45m: Study custom Dataset indexing and batching mechanics.\n60m: Code CSVDataset streaming CRM text & metadata.\n60m: Integrate DataLoader with batch_size=32.\n15m: Check memory usage.", "RES-014", 180, 0, "Custom PyTorch Dataset class with unit test", "Not Started", "", ""),
        ("2026-11-29", "Day 29", "Comprehensive Month 1 Self-Assessment", "60m: Complete written closed-book recall exam on Phase 1 & 2.\n60m: Live coding test: Implement Logistic Regression in 45m.\n45m: Grade results honestly against rubric.\n15m: Record gaps.", "Self-Assessment Rubric", 180, 0, "Completed Month 1 self-assessment scorecard", "Not Started", "", ""),
        ("2026-11-30", "Day 30", "Month 1 Retrospective & Phase 3 Transition Plan", "60m: Audit total hours logged vs 75h target.\n60m: Refactor codebases and organize notes.\n45m: Finalize Phase 3 Deep Learning study schedule.\n15m: Month 1 completion sign-off.", "Dashboard Sheet", 180, 0, "Month 1 retrospective document & Phase 3 roadmap", "Not Started", "", "")
    ]

    for idx, a in enumerate(agenda_days, start=5):
        ws.row_dimensions[idx].height = 42
        fill = fill_zebra if idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(a, start=1):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = font_bold if c_idx in [1, 2, 8, 9] else font_data
            cell.fill = fill
            cell.border = border_thin
            
            if c_idx in [1, 2, 5, 9]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c_idx in [6, 7]:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '#,##0'
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    tot_row = len(agenda_days) + 5
    # Total row
    ws.row_dimensions[tot_row].height = 24
    ws.merge_cells(start_row=tot_row, start_column=1, end_row=tot_row, end_column=5)
    c_tot = ws.cell(row=tot_row, column=1, value="TOTAL PLANNED MINUTES (30 DAYS)")
    c_tot.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_tot.alignment = Alignment(horizontal='right', vertical='center')
    c_tot.fill = fill_total
    for c in range(1, 6):
        ws.cell(row=tot_row, column=c).border = border_double_bottom
        ws.cell(row=tot_row, column=c).fill = fill_total

    c_plan = ws.cell(row=tot_row, column=6, value=f"=SUM(F5:F{tot_row-1})")
    c_plan.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_plan.fill = fill_total
    c_plan.border = border_double_bottom
    c_plan.alignment = Alignment(horizontal='right', vertical='center')
    c_plan.number_format = '#,##0'

    c_act = ws.cell(row=tot_row, column=7, value=f"=SUM(G5:G{tot_row-1})")
    c_act.font = Font(name=font_family, size=10, bold=True, color="1A365D")
    c_act.fill = fill_total
    c_act.border = border_double_bottom
    c_act.alignment = Alignment(horizontal='right', vertical='center')
    c_act.number_format = '#,##0'

    for c in range(8, 12):
        cell = ws.cell(row=tot_row, column=c)
        cell.fill = fill_total
        cell.border = border_double_bottom

    # Validations
    dv_status = DataValidation(type="list", formula1='"Not Started,In Progress,Completed,Missed"', allow_blank=True)
    ws.add_data_validation(dv_status)
    dv_status.add(f"I5:I{tot_row-1}")

    widths = [12, 10, 26, 35, 14, 14, 14, 30, 13, 24, 24]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.auto_filter.ref = f"A4:K{tot_row-1}"

print("Daily Study Agenda module ready.")
