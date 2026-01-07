# PlanSync AI Technical Coding Assessment

## Overview

Please read the full assessment details in `PlanSync_Technical_Coding_Assessment.pdf`.

Your task is to build a simplified version of a document extraction pipeline that processes 401(k) plan documents and extracts structured data.

## Sample Documents

Sample 401(k) plan adoption agreements are provided in the `Documents/` folder for testing your solution.

## Evaluation Criteria

| Criteria | Weight | What We Look For |
|----------|--------|------------------|
| Functionality | 40% | Does it work? Can we upload a PDF and see extracted data? |
| Parallel Processing | 25% | Can it handle multiple pdfs at the same time without queuing? Embarrassingly parallel system should work |
| Speed | 10% | Can you make the processing time per extraction for a pdf faster? |
| UI/UX | 15% | Is the interface intuitive? Loading states? Error messages? |
| Documentation | 10% | README with setup instructions. Code comments where needed. |


## Tips for Success

- **Start simple**: Get a basic working version first, then add features
- **Test with real PDFs**: The provided samples are representative of actual documents
- **Show your thinking**: Comments explaining why you made certain decisions are valuable
- **AI/LLM based tools**: Use any LLM based tools you want to use or feel comfortable using. We are more interested in your thinking process and code quality.
- **Ask questions**: If something is unclear, email me at tahmid.awal@plansync.ai

## Submission Instructions

1. Create a private GitHub repository with your solution
2. Include a README.md with:
   - Setup instructions
   - Architecture overview
   - Any assumptions or trade-offs made
3. Add the repository collaborator as specified in the assessment
4. Email the repo link when complete

