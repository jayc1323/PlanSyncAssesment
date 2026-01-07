"use client";
import { useState } from "react";
import DocumentBox from "./components/DocumentBox";

export default function Home() {
  // Store a list of IDs for each document processing div
  const [processors, setProcessors] = useState([crypto.randomUUID()]);

  const addProcessor = () => {
    setProcessors([...processors, crypto.randomUUID()]);
  };

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-center">Document Processor</h1>
      
      <div className="space-y-6">
        {processors.map((id) => (
          <DocumentBox key={id} onRemove={() => {
            if(processors.length > 1) setProcessors(processors.filter(p => p !== id))
          }} />
        ))}
      </div>

      <button 
        onClick={addProcessor}
        className="w-full py-3 border-2 border-dashed border-blue-400 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors font-medium"
      >
        + Add Another Document
      </button>
    </main>
  );
}