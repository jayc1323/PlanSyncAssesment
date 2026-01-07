from fastapi import FastAPI,UploadFile
from fastapi.responses import StreamingResponse
from google import genai
from datetime import date
from pydantic import BaseModel,types,Field
from PyPDF2 import PdfReader
import asyncio
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows everything during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
GEMINI_API_KEY = "AIzaSyCAFSXbfRbVnZaCLVHqFWhahi0U9ErflaA"
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

async def streamResponse(prompt:str):
    stream = await client.aio.models.generate_content_stream(model=LLM_MODEL,
                                                     contents=prompt,
                                                        config={ "temperature" : 0,
                                                                "response_mime_type": "application/json",
                                                                "response_json_schema": DocumentData.model_json_schema(),
                                                            }
                                                           )
    async for chunk in stream:
        if chunk.text:
            # Wrap in SSE format: "data: <content>\n\n"
            # This allows the frontend to parse chunks as they arrive
            print (chunk.text)
            yield f"{chunk.text}"


@app.post("/extract")
async def processDoc(file : UploadFile):
    # 1. Convert PDF to text
    text_content = pdf_to_text(file)
    
    # 2. Build prompt for Gemini
    prompt = f"Use the given document below to extract the requested data :\n{text_content}"
    
    return StreamingResponse(
        streamResponse(prompt),
        media_type="text/event-stream"
    )



