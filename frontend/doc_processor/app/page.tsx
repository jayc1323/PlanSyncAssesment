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
  const [history, setHistory] = useState<any[] | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
        const response = await fetch(`${apiUrl}/history`);
        const data = await response.json();
        setHistory(data);
    } catch (error) {
        console.error("Failed to fetch history:", error);
    } finally {
        setIsHistoryLoading(false);
    }
};

const clearHistory = () => {
    setHistory(null);
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

      <div className="mt-8 p-6 border-t border-gray-200">
    <div className="flex gap-4 mb-4">
        <button 
            onClick={fetchHistory}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
            {isHistoryLoading ? "Loading..." : "Fetch History"}
        </button>
        
        {history && (
            <button 
                onClick={clearHistory}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            >
                Clear
            </button>
        )}
    </div>

    {/* The Pretty Print Box */}
    {history && (
        <div className="relative">
            <div className="absolute top-3 right-3 text-xs font-mono text-gray-400 uppercase">
                SQLite History
            </div>
            <pre className="bg-gray-900 text-green-400 p-6 rounded-xl overflow-auto max-h-[500px] font-mono text-sm shadow-inner">
                {JSON.stringify(history, null, 2)}
            </pre>
        </div>
    )}
</div>
    </main>
  );
}