from fastapi import FastAPI,UploadFile
from fastapi.responses import StreamingResponse
from google import genai
from datetime import date
from pydantic import BaseModel,types,Field
from PyPDF2 import PdfReader
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from fastapi import BackgroundTasks
import os
from dotenv import load_dotenv
from typing import Optional
from sqlmodel import SQLModel, Field, create_engine, Session,select
from contextlib import asynccontextmanager
from sqlmodel import select




load_dotenv() # Only needed for local development
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in the environment!")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs BEFORE the app starts taking requests
    create_db_and_tables() 
    yield
    # Code here runs when the app is shutting down

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows everything during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LLM_MODEL = "gemini-2.5-flash"
#other lightweight variant - "gemini-2.5-flash-lite"
client = genai.Client(api_key=GEMINI_API_KEY)

@app.get("/")
def defaultresult():
    return "Hello World"

class DocumentData(BaseModel):
    PlanName:tuple[str | None, int | None] = Field(default= (None,None),description='''The official name of the retirement plan (e.g., “Acme Corp 401(k) Plan”).
                                Usually found near the beginning of the document or in the General Infor-
                                mation section and the page number you find this.Return null if not found.''')
    EmployerName:tuple[str | None, int | None]  = Field(default= (None,None),description='''The legal name of the company sponsoring the plan. Often listed under
                                        “Employer Information” and may differ slightly from the plan name and the page number you find this.Return null if not found.''')
    PlanEffectiveDate: tuple[date | None, int | None]  = Field(default= (None,None),description =''' The date the plan originally became effective. Do not confuse this with
                                        amendment or restatement dates and the page number you find this .Return null if not found.''')
    EligibilityReqs:tuple[str | None, int | None]  = Field(default= (None,None),description ='''A short text description of who can participate in the plan, typically including
                                minimum age and service requirements and the page number you find this .Return null if not found. ''')
    EmployeeContributionLimit:tuple[int | None, int | None]  = Field(default= (None,None),description ='''The maximum percentage of compensation an employee is allowed to defer
                                        into the plan, as stated in the document and the page number you find this .Return null if not found. ''')
    EmployerMatchFormula : tuple[str | None, int | None]  = Field(default= (None,None),description ='''A text description of how employer matching contributions are calculated
                                    (e.g., “100% of the first 3% of compensation plus 50% of the next 2%”) and the page number you find this .Return null if not found. ''')
    SafeHarborStatus : tuple[bool | None, int | None]  = Field(default= (None,None),description ='''Indicates whether the plan includes Safe Harbor contributions. Return True
                                    if Safe Harbor contributions are explicitly permitted; otherwise return False and the page number you find this .Return null if not found. ''')
    VestingSchedule:tuple[str | None, int | None]  = Field(default= (None,None),description ='''A text description of how employer contributions vest over time (e.g., imme-
                                    diate vesting, cliff vesting after 3 years, or graded vesting) and the page number you find this . Return null if not found. ''')
class PlanRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    file_name: Optional[str] = None 
    # Store only the values, no page numbers
    plan_name: Optional[str] = None
    employer_name: Optional[str] = None
    effective_date: Optional[date] = None
    eligibility: Optional[str] = None
    contribution_limit: Optional[int] = None
    match_formula: Optional[str] = None
    safe_harbor: Optional[bool] = None
    vesting: Optional[str] = None

# Create the SQLite engine
sqlite_url = "sqlite:///./database.db"
engine = create_engine(sqlite_url)

# Call this once during app startup
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def save_to_db(data: DocumentData,filename:str):
    # Map DocumentData (tuples) to PlanRecord (flat values)
    record = PlanRecord(
        file_name=filename,
        plan_name=data.PlanName[0],
        employer_name=data.EmployerName[0],
        effective_date=data.PlanEffectiveDate[0],
        eligibility=data.EligibilityReqs[0],
        contribution_limit=data.EmployeeContributionLimit[0],
        match_formula=data.EmployerMatchFormula[0],
        safe_harbor=data.SafeHarborStatus[0],
        vesting=data.VestingSchedule[0]
    )

    with Session(engine) as session:
        session.add(record)
        session.commit()
        session.refresh(record)
    return record

# Helper to convert PDF to text
def pdf_to_text(file: UploadFile) -> str:
    # We use file.file because PdfReader expects a file-like object
    reader = PdfReader(file.file)
    text = ""
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            # Adding a clear structural marker
            text += f"\n--- PAGE {i + 1} ---\n" 
            text += page_text + "\n"
    return text

async def streamResponse(prompt:str,filename:str,backgroundtask:BackgroundTasks):
    stream = await client.aio.models.generate_content_stream(model=LLM_MODEL,
                                                     contents=prompt,
                                                        config={ "temperature" : 0,
                                                                "response_mime_type": "application/json",
                                                                "response_json_schema": DocumentData.model_json_schema(),
                                                            }
                                                           )
    response = ""
    async for chunk in stream:
        if chunk.text:
            # Wrap in SSE format: "data: <content>\n\n"
            # This allows the frontend to parse chunks as they arrive
            print (chunk.text)
            response+=chunk.text
            yield f"{chunk.text}"

    if response:
        try:
            # Parse the full collected string into your Pydantic model
            parsed_data = DocumentData.model_validate_json(response)
            backgroundtask.add_task(save_to_db, parsed_data,filename)
        except Exception as e:
            print(f"Failed to parse gemini output to DB instance: {e}")


@app.post("/extract")
async def processDoc(file : UploadFile,backgroundTask : BackgroundTasks):
    # 1. Convert PDF to text
    text_content = pdf_to_text(file)
    
    # 2. Build prompt for Gemini
    prompt = f"Use the given document below to extract the requested data :\n{text_content}"
    
    return StreamingResponse(
        streamResponse(prompt,file.filename,backgroundTask),
        media_type="text/event-stream"
    )


@app.get("/history")
async def get_history():
    with Session(engine) as session:
        # This is the SQLModel version of "SELECT * FROM planrecord"
        statement = select(PlanRecord)
        results = session.exec(statement).all()
        return results
