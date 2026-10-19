import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_sheet_start_here(wb, font_family="Segoe UI"):
    ws = wb["Start Here"] if "Start Here" in wb.sheetnames else wb.create_sheet("Start Here", 0)
    ws.views.sheetView[0].showGridLines = True
    
    font_title = Font(name=font_family, size=15, bold=True, color="1A365D")
    font_sub = Font(name=font_family, size=10, italic=True, color="4A5568")
    font_sec = Font(name=font_family, size=11, bold=True, color="FFFFFF")
    font_b = Font(name=font_family, size=9, bold=True, color="2D3748")
    font_r = Font(name=font_family, size=9, color="2D3748")
    font_bullet = Font(name=font_family, size=9, color="1A365D", bold=True)
    
    fill_sec = PatternFill(start_color="1A365D", end_color="1A365D", fill_type="solid")
    fill_sub_sec = PatternFill(start_color="2C7A7B", end_color="2C7A7B", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_box = PatternFill(start_color="F0F4F8", end_color="F0F4F8", fill_type="solid")
    
    border_thin = Border(
        left=Side(style='thin', color='CBD5E0'), right=Side(style='thin', color='CBD5E0'),
        top=Side(style='thin', color='CBD5E0'), bottom=Side(style='thin', color='CBD5E0')
    )
    
    # Title
    ws.row_dimensions[1].height = 26
    ws.row_dimensions[2].height = 18
    ws['A1'] = "AI / ML & AI AGENT ENGINEERING MASTER TRACKER"
    ws['A1'].font = font_title
    ws['A2'] = "Evidence-Based Learning Management System & Roadmap for Building Autonomous AI Sales Employees & Commercial Products"
    ws['A2'].font = font_sub
    
    row = 4
    def add_section_header(title, fill=fill_sec):
        nonlocal row
        ws.row_dimensions[row].height = 24
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
        c = ws.cell(row=row, column=1, value=f"  {title.upper()}")
        c.font = font_sec
        c.fill = fill
        c.alignment = Alignment(horizontal='left', vertical='center')
        for col in range(2, 8):
            ws.cell(row=row, column=col).border = border_thin
        c.border = border_thin
        row += 1

    # Section 1
    add_section_header("1. Learner Profile & Strategic Career Objectives")
    info_rows = [
        ("Current OS & Tools", "Ubuntu Linux | VS Code | Git & GitHub | Python 3.10+ | PyTorch | FastAPI | PostgreSQL | Docker"),
        ("Current Background", "Backend development experience (Python, Django, REST APIs, SQL databases). Strong foundation in web and data services."),
        ("Primary Career Goal", "Master AI, Machine Learning, Deep Learning, LLMs, and AI Agent Engineering from foundations to advanced commercial systems."),
        ("Target Commercial Goal", "Design, build, deploy, and sell an Autonomous AI Sales Employee capable of performing end-to-end B2B sales cycles."),
        ("Recommended Pace", "12 Months | 2–3 hours per day | 6 days per week | Minimum 750–900 cumulative focused learning hours."),
    ]
    for lbl, val in info_rows:
        ws.row_dimensions[row].height = 20
        c1 = ws.cell(row=row, column=1, value=lbl)
        c1.font = font_b
        c1.fill = fill_box
        c1.border = border_thin
        c1.alignment = Alignment(horizontal='left', vertical='center')
        
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=7)
        c2 = ws.cell(row=row, column=2, value=val)
        c2.font = font_r
        c2.border = border_thin
        c2.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        for col in range(3, 8):
            ws.cell(row=row, column=col).border = border_thin
        row += 1
        
    row += 1
    # Section 2: AI Sales Employee 12 capabilities
    add_section_header("2. Target Commercial Product: Autonomous AI Sales Employee (12 Core Capabilities)", fill_sub_sec)
    capabilities = [
        ("1. Lead Discovery", "Automatically search web, directories, and business APIs to find relevant target customer profiles and accounts."),
        ("2. Lead Qualification", "Conduct background research on companies, scrape key decision-makers, and score leads using the BANT framework."),
        ("3. Needs Discovery", "Engage leads in consultative dialogue to identify operational pain points, budget constraints, and purchase intent."),
        ("4. Omnichannel Outreach", "Communicate fluently across Email (SMTP/IMAP), Web Chat, WhatsApp Business API, and Voice synthesis."),
        ("5. Product Q&A", "Answer complex technical and commercial questions with high accuracy using grounded Enterprise RAG pipelines."),
        ("6. Recommendation Engine", "Analyze lead requirements and recommend the optimal tier, product package, and customization options."),
        ("7. Guardrailed Negotiation", "Negotiate pricing, payment terms, and discounts strictly within predefined rule-based business boundaries."),
        ("8. Persistent Follow-ups", "Execute multi-touch follow-up sequences across days/weeks, adapting messaging dynamically to lead engagement."),
        ("9. Quotation & Order Generation", "Generate formal PDF sales quotes, proforma invoices, and capture digital signatures or checkout triggers."),
        ("10. CRM & ERP Sync", "Update HubSpot/Salesforce, trigger ERP workflows, write conversation logs, and synchronize pipeline status in real time."),
        ("11. Sales Analytics & Tracking", "Log all interaction transcripts, sentiment trends, objection patterns, and conversion rates to a central database."),
        ("12. Human Escalation (HITL)", "Detect sensitive negotiations, angry customers, or complex custom requests and smoothly hand off to a human manager.")
    ]
    for i in range(0, len(capabilities), 2):
        ws.row_dimensions[row].height = 24
        # Left item
        num1, desc1 = capabilities[i]
        c1 = ws.cell(row=row, column=1, value=num1)
        c1.font = font_bullet
        c1.border = border_thin
        c1.fill = fill_box
        
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=3)
        c2 = ws.cell(row=row, column=2, value=desc1)
        c2.font = font_r
        c2.border = border_thin
        c2.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        ws.cell(row=row, column=3).border = border_thin
        
        # Right item
        num2, desc2 = capabilities[i+1]
        c3 = ws.cell(row=row, column=4, value=num2)
        c3.font = font_bullet
        c3.border = border_thin
        c3.fill = fill_box
        
        ws.merge_cells(start_row=row, start_column=5, end_row=row, end_column=7)
        c4 = ws.cell(row=row, column=5, value=desc2)
        c4.font = font_r
        c4.border = border_thin
        c4.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        for col in range(6, 8):
            ws.cell(row=row, column=col).border = border_thin
        row += 1

    row += 1
    # Section 3: Daily Study Routine
    add_section_header("3. Recommended Daily Study Routine (2.5 - 3.0 Hours Structure)")
    routines = [
        ("Step 1 (45 mins)", "Concept Study & Foundations", "Read official documentation, research papers, or mathematical foundations. Write notes in your own words."),
        ("Step 2 (60 mins)", "Hands-On Coding & Exercises", "Implement algorithms from scratch (NumPy/PyTorch) or solve practical coding challenges without copying solutions."),
        ("Step 3 (60 mins)", "Practical Project Implementation", "Build components for your AI Sales Employee (RAG pipeline, tool calling, FastAPI endpoints, agent state machine)."),
        ("Step 4 (15 mins)", "Review, Assessment & Logging", "Log actual time, update tracker, record difficulties, evaluate recall without looking at notes, and schedule revisions.")
    ]
    for step, name, desc in routines:
        ws.row_dimensions[row].height = 20
        c1 = ws.cell(row=row, column=1, value=step)
        c1.font = font_b
        c1.border = border_thin
        c1.fill = fill_box
        c2 = ws.cell(row=row, column=2, value=name)
        c2.font = font_b
        c2.border = border_thin
        c2.fill = fill_zebra
        ws.merge_cells(start_row=row, start_column=3, end_row=row, end_column=7)
        c3 = ws.cell(row=row, column=3, value=desc)
        c3.font = font_r
        c3.border = border_thin
        c3.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        for col in range(4, 8):
            ws.cell(row=row, column=col).border = border_thin
        row += 1

    row += 1
    # Section 4: Worksheet Navigation Map
    add_section_header("4. How to Use This Workbook (Worksheet Navigation Map)", fill_sub_sec)
    sheets_guide = [
        ("1. Start Here", "Executive orientation, career objectives, commercial agent vision, study habits, and workbook instructions.", "Read once & reference monthly"),
        ("2. Master Roadmap", "The 12-month, 12-phase curriculum from Python/math to advanced autonomous AI sales agents.", "Review weekly for pacing"),
        ("3. Detailed Learning Tracker", "Primary operational log for every study session: timestamps, planned vs actual hours, confidence, evidence.", "Update daily after each session"),
        ("4. Official Learning Resources", "Curated official documentation and courses from Google, OpenAI, Meta, PyTorch, Hugging Face, etc.", "Consult before starting topics"),
        ("5. Topic Completion Checklist", "Granular checklist of core skills across Python, ML, DL, LLMs, Agents, Production, and Business.", "Update upon topic mastery"),
        ("6. Tutorial & Course Tracker", "Monitor courses, research papers, and technical tutorials with practical exercise verification.", "Update as courses progress"),
        ("7. AI Project Backlog", "The 10 foundational to enterprise-grade AI projects, culminating in the production AI sales employee.", "Track sprint deliverables"),
        ("8. Daily Study Agenda", "Structured 30-day agenda breaking learning into specific, time-blocked daily deliverables.", "Follow daily for discipline"),
        ("9. Weekly Review & Analysis", "Weekly honest retrospectives: planned vs actual hours, blockers, inefficiencies, and schedule adjustments.", "Complete every Sunday"),
        ("10. Progress Dashboard", "Automated analytics: KPI metric cards, completion percentages, hours by phase, and dynamic charts.", "Review anytime for motivation"),
        ("11. Notes & Document Library", "Repository of architecture decisions, code templates, system prompts, and research summaries.", "Update with key technical learnings"),
        ("12. AI Experiment Log", "Scientific log for prompts, hyperparameters, latency benchmarks, tool accuracy, and failure cases.", "Log every agent/model test"),
        ("13. Commercial Product Validation", "Customer problem validation, interview notes, willingness to pay, unit economics, and pilot metrics.", "Update during business validation")
    ]
    for sname, sdesc, scalf in sheets_guide:
        ws.row_dimensions[row].height = 20
        c1 = ws.cell(row=row, column=1, value=sname)
        c1.font = font_b
        c1.border = border_thin
        c1.fill = fill_box
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=5)
        c2 = ws.cell(row=row, column=2, value=sdesc)
        c2.font = font_r
        c2.border = border_thin
        c2.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        for col in range(3, 6):
            ws.cell(row=row, column=col).border = border_thin
        ws.merge_cells(start_row=row, start_column=6, end_row=row, end_column=7)
        c3 = ws.cell(row=row, column=6, value=scalf)
        c3.font = font_b
        c3.border = border_thin
        c3.alignment = Alignment(horizontal='center', vertical='center')
        ws.cell(row=row, column=7).border = border_thin
        row += 1

    row += 1
    # Section 5: Completion Criteria
    add_section_header("5. Rigorous Completion & Mastery Verification Rules")
    rules = [
        ("Rule 1: Evidence Over Emotion", "Spending 50 hours studying or feeling confident does NOT equal mastery. Only mark 'Completed' or 'Mastered' when backed by independent code or working projects."),
        ("Rule 2: Unaided Recall Test", "Before completing a topic, explain the core concepts in plain English without looking at any notes, tutorials, or AI chat assistants."),
        ("Rule 3: Scratch Implementation", "Write a clean implementation from scratch. If studying Linear Regression, code the gradient descent loop. If studying Agents, write the ReAct loop without a library."),
        ("Rule 4: Delayed Retention Verification", "Re-test yourself after 7 and 14 days. If you cannot explain or implement the concept after a week, downgrade the topic status to 'Needs Revision'."),
        ("Rule 5: No Passive Tutorial Hell", "Never watch a video or read a tutorial passively without producing working code, test cases, or an architectural diagram committed to GitHub.")
    ]
    for rnum, rtext in rules:
        ws.row_dimensions[row].height = 20
        c1 = ws.cell(row=row, column=1, value=rnum)
        c1.font = font_b
        c1.border = border_thin
        c1.fill = fill_box
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=7)
        c2 = ws.cell(row=row, column=2, value=rtext)
        c2.font = font_r
        c2.border = border_thin
        c2.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        for col in range(3, 8):
            ws.cell(row=row, column=col).border = border_thin
        row += 1

    # Widths
    ws.column_dimensions['A'].width = 24
    ws.column_dimensions['B'].width = 22
    ws.column_dimensions['C'].width = 24
    ws.column_dimensions['D'].width = 24
    ws.column_dimensions['E'].width = 24
    ws.column_dimensions['F'].width = 20
    ws.column_dimensions['G'].width = 20

print("Start Here module ready.")
