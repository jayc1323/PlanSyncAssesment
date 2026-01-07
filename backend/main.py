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
    PlanName:str = Field(description='''The official name of the retirement plan (e.g., “Acme Corp 401(k) Plan”).
                                Usually found near the beginning of the document or in the General Infor-
                                mation section''')
    EmployerName:str = Field(description='''The legal name of the company sponsoring the plan. Often listed under
                                        “Employer Information” and may differ slightly from the plan name.''')
    PlanEffectiveDate: date = Field(description =''' The date the plan originally became effective. Do not confuse this with
                                        amendment or restatement dates''')
    EligibilityReqs:str = Field(description ='''A short text description of who can participate in the plan, typically including
                                minimum age and service requirements. ''')
    EmployeeContributionLimit:int = Field(description ='''The maximum percentage of compensation an employee is allowed to defer
                                        into the plan, as stated in the document. ''')
    EmployerMatchFormula : str = Field(description ='''A text description of how employer matching contributions are calculated
                                    (e.g., “100% of the first 3% of compensation plus 50% of the next 2%”). ''')
    SafeHarborStatus :bool = Field(description ='''Indicates whether the plan includes Safe Harbor contributions. Return True
                                    if Safe Harbor contributions are explicitly permitted; otherwise return False. ''')
    VestingSchedule:str = Field(description ='''A text description of how employer contributions vest over time (e.g., imme-
                                    diate vesting, cliff vesting after 3 years, or graded vesting) ''')

# Helper to convert PDF to text
def pdf_to_text(file: UploadFile) -> str:
    reader = PdfReader(file.file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
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



