#!/usr/bin/env python3
"""
Master Build Script for AI_ML_AI_Agent_Learning_Roadmap_Tracker.xlsx
Assembles all 13 sheets with professional formatting, formulas, validation, and charts.
"""

import sys
import openpyxl

from builder_start_here import build_sheet_start_here
from builder_roadmap import build_sheet_roadmap
from builder_tracker import build_sheet_tracker
from builder_resources import build_sheet_resources
from builder_checklist import build_sheet_checklist
from builder_tutorials import build_sheet_tutorials
from builder_projects import build_sheet_projects
from builder_agenda import build_sheet_agenda
from builder_weekly import build_sheet_weekly
from builder_dashboard import build_sheet_dashboard
from builder_notes import build_sheet_notes
from builder_experiments import build_sheet_experiments
from builder_validation import build_sheet_validation

OUTPUT_FILE = "AI_ML_AI_Agent_Learning_Roadmap_Tracker.xlsx"

def main():
    print(f"Creating workbook: {OUTPUT_FILE}...")
    wb = openpyxl.Workbook()
    default_sheet = wb.active
    default_sheet.title = "Start Here"
    
    # 1. Start Here
    print("Building Sheet 1: Start Here...")
    build_sheet_start_here(wb)
    
    # 2. Master Roadmap
    print("Building Sheet 2: Master Roadmap...")
    build_sheet_roadmap(wb)
    
    # 3. Detailed Learning Tracker
    print("Building Sheet 3: Detailed Learning Tracker...")
    build_sheet_tracker(wb)
    
    # 4. Official Learning Resources
    print("Building Sheet 4: Official Learning Resources...")
    build_sheet_resources(wb)
    
    # 5. Topic Completion Checklist
    print("Building Sheet 5: Topic Completion Checklist...")
    build_sheet_checklist(wb)
    
    # 6. Tutorial and Course Tracker
    print("Building Sheet 6: Tutorial and Course Tracker...")
    build_sheet_tutorials(wb)
    
    # 7. AI Project Backlog
    print("Building Sheet 7: AI Project Backlog...")
    build_sheet_projects(wb)
    
    # 8. Daily Study Agenda
    print("Building Sheet 8: Daily Study Agenda...")
    build_sheet_agenda(wb)
    
    # 9. Weekly Review and Analysis
    print("Building Sheet 9: Weekly Review and Analysis...")
    build_sheet_weekly(wb)
    
    # 10. Progress Dashboard
    print("Building Sheet 10: Progress Dashboard...")
    build_sheet_dashboard(wb)
    
    # 11. Notes and Document Library
    print("Building Sheet 11: Notes and Document Library...")
    build_sheet_notes(wb)
    
    # 12. AI Experiment Log
    print("Building Sheet 12: AI Experiment Log...")
    build_sheet_experiments(wb)
    
    # 13. Commercial Product Validation
    print("Building Sheet 13: Commercial Product Validation...")
    build_sheet_validation(wb)
    
    # Ensure active sheet is Start Here
    wb.active = wb["Start Here"]
    
    print(f"Saving workbook to {OUTPUT_FILE}...")
    wb.save(OUTPUT_FILE)
    print("SUCCESS: Workbook generated successfully!")

if __name__ == "__main__":
    main()
