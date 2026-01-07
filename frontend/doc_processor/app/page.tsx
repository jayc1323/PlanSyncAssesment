"use client";
import { useState } from "react";
import DocumentBox from "./components/DocumentBox";

export default function Home() {
  const [processors, setProcessors] = useState([{ id: crypto.randomUUID(), trigger: 0 }]);

  const addProcessor = () => {
    setProcessors([...processors, { id: crypto.randomUUID(), trigger: 0 }]);
  };

  const processAll = () => {
    setProcessors(processors.map(p => ({ ...p, trigger: p.trigger + 1 })));
  };

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8 bg-gray-50 min-h-screen relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Document Processor</h1>
          <p className="text-gray-500">Extract 401k policy details in seconds . Supports multiple documents.</p>
        </div>
        <button 
          onClick={processAll}
          className="px-6 py-2 border border-black bg-transparent text-black transition-all hover:bg-black hover:text-white rounded-lg font-medium"
        >
          Process All
        </button>
      </div>
      
      <div className="grid gap-6">
        {processors.map((p) => (
          <DocumentBox 
            key={p.id} 
            triggerProcess={p.trigger}
            onRemove={() => {
              if(processors.length > 1) setProcessors(processors.filter(proc => proc.id !== p.id))
            }} 
          />
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <button 
          onClick={addProcessor}
          className="px-8 py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-black hover:text-black hover:bg-white transition-all font-medium"
        >
          + Add Document 
        </button>
      </div>
    </main>
  );
}