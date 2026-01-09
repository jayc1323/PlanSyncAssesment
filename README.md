# Setup Instructions
 - To run locally - Run ./run_app.sh and go to http://localhost:3000 
 - Or a live version is deployed at https://king-prawn-app-jlhv9.ondigitalocean.app/

# Architecture overview
 ## FastAPI Backend 
  Endpoints : i) POST - /extract - accepts a pdf document and returns a streaming response and
              ii) GET - /history - returns a history of the documents and associated data saved in the database in JSON Form 
 
 ## Class - DocumentData
 This class serves as the schema for the LLM to return the output and has fields with the expected types - eg: PlanEffectiveDate : Date |None , 
                     PlanName : Str | None and their associated description to aid the LLM in retrieval . None type is 
                     added as the LLM is allowed to return null if that field is not found and explicit instruction to return null 
                     if that field is not found is added in the description to reduce possibility of invalid answers and allowing 
                     the LLM to return null for documents which are not 401k policies or if the field is not found.
 
 ## LLM Call:
-  Used pyPDF2 to convert user uploaded pdf to text and passed it as the prompt parameter to 'generate_content_stream' function for gemini client which works as per requirement and returns 
                    the response as a stream . Requested structured outputs from the LLM Call by explicitly passing the DocumentData json schema as 
                    a requirement so that responses are restricted to JSON objects of the class and no unnecessary data is retrieved - this makes passing the responses on to the user straightforward without requiring backend to process the LLM output further , which avoids further delay. 

- Prompt - The text from the pdf is sent as the prompt and page numbers are added to help the LLM retrieve  the page numbers as well with each associated field. Also added to the field description is a statement encouraging LLM to return null if the field is not found and this works correctly as the LLM retrieves null for fields when documents are not 401k policies. The temperature is set to 0 so the output is more deterministic.

## Parallel Processing:
Using async/await wherever possible for blocking operations like llm api call, setting database functionality as a background task to maintain high throughput . Running the backend with multiple workers to handle more documents in parallel.

## Database:
Used SQLite - lightweight file based database . Defined a class PlanRecord that serves as ORM - stores the filename and the associated retrieved data.

## Frontend: 
NextJS Frontend with the expected UI functionality - supporting adding multiple documents , button to process them all together or individually and also a history box to fetch prior executed requests.
Streams incoming data from the backend and shows loading state.