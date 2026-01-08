# Create a file named run.sh
#!/bin/bash

# Start backend in the background
echo "Starting Backend..."
cd backend && fastapi dev main.py &

# Start frontend (this stays in the foreground)
echo "Starting Frontend..."
cd frontend/doc_processor && npm run dev