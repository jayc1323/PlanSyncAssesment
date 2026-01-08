"use client";
import { useState, useEffect } from "react";
import { parse } from "partial-json";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const EXPECTED_FIELDS = ["PlanName", "EmployerName", "PlanEffectiveDate", "EligibilityReqs", "EmployeeContributionLimit", "EmployerMatchFormula", "SafeHarborStatus", "VestingSchedule"];

export default function DocumentBox({ onRemove, triggerProcess }: { onRemove: () => void, triggerProcess: number }) {
    const [file, setFile] = useState<File | null>(null);
    const [rawText, setRawText] = useState("");
    const [parsedData, setParsedData] = useState<any>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (triggerProcess > 0 && file && !loading) {
            handleProcess();
        }
    }, [triggerProcess]);

    useEffect(() => {
        if (!rawText) return;
        try {
            const data = parse(rawText);
            setParsedData(data);
        } catch (e) { }
    }, [rawText]);

    const handleReset = () => {
        setFile(null);
        setRawText("");
        setParsedData({});
        setLoading(false);
    };

    const handleProcess = async () => {
        if (!file) return;
        setLoading(true);
        setRawText("");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${apiUrl}/extract`, { method: "POST", body: formData });
            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                setRawText((prev) => prev + decoder.decode(value, { stream: true }));
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const hasData = rawText.length > 0 || loading;

    return (
        <div className={`transition-all duration-300 flex flex-row gap-6 p-6 border rounded-xl shadow-md bg-white relative ${hasData ? 'min-h-[500px]' : 'min-h-[140px]'}`}>
            <button onClick={onRemove} className="absolute -top-2 -right-2 bg-white border rounded-full p-1 text-gray-400 hover:text-red-500 shadow-sm z-10">✕</button>

            {/* LEFT SIDE: Fixed height container */}
            <div className="w-72 flex-shrink-0 flex flex-col justify-start gap-3">
                <label
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                    }}
                    className="h-40 flex flex-col items-center justify-center border-2 border-dotted border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-black transition-colors bg-gray-50 overflow-hidden"
                >
                    <span className="text-xs text-gray-500 font-medium break-all px-2">
                        {file ? file.name : "Drag & Drop or Click"}
                    </span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleProcess}
                        disabled={!file || loading}
                        className="w-full py-2 border border-black bg-transparent text-black transition-all hover:bg-black hover:text-white rounded-lg text-sm font-semibold disabled:border-gray-200 disabled:text-gray-300"
                    >
                        {loading ? "Processing..." : "Process"}
                    </button>
                    <button
                        onClick={handleReset}
                        className="w-full py-2 border border-gray-200 bg-transparent text-gray-500 transition-all hover:bg-gray-100 rounded-lg text-sm font-medium"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* RIGHT SIDE: TABLE */}
            {hasData && (
                <div className="flex-grow border-l pl-6 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-500">
                    <table className="w-full text-left text-sm border-collapse table-fixed">
                        <thead>
                            <tr className="border-b text-gray-400 uppercase text-[10px] tracking-wider">
                                <th className="py-2 w-1/3">Field</th>
                                <th className="py-2 w-1/2">Value</th>
                                <th className="py-2 w-[60px] text-right">Page</th>
                            </tr>
                        </thead>
                       <tbody className="divide-y">
                          {EXPECTED_FIELDS.map((key) => {
                                        const obj = parsedData[key];
                                        // Check if it's an array and grab the first element
                                        const rawValue = Array.isArray(obj) ? obj[0] : null;
                                        const pageNo = Array.isArray(obj) ? obj[1] : "";
                                        
                                        // LOGIC FIX: Check if the value is specifically null/undefined/empty string
                                        // We check (rawValue !== true && rawValue !== false) to ensure booleans aren't marked as "Empty"
                                        const isDataMissing = (rawValue === null || rawValue === undefined || rawValue === "");
                                        const isEmpty = !loading && rawText.length > 0 && isDataMissing;
                                        
                                        // Formatting Logic
                                        let displayValue: any = rawValue;

                                        // Handle Booleans (Safe Harbor often comes back as true/false)
                                        if (typeof rawValue === "boolean") {
                                            displayValue = rawValue ? "Yes" : "No";
                                        } 
                                        // Handle Percentage
                                        else if (key === "EmployeeContributionLimit" && rawValue) {
                                            const strVal = String(rawValue);
                                            displayValue = strVal.includes("%") ? strVal : `${strVal}%`;
                                        }

                                        return (
                                            <tr key={key} className="align-top hover:bg-gray-50 transition-colors">
                                                <td className="py-3 font-semibold text-gray-700 text-[13px]">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    {key === "EmployeeContributionLimit" && " (%)"}
                                                </td>
                                                <td className="py-3 text-gray-600">
                                                    <div className="max-h-24 overflow-y-auto leading-relaxed pr-2 text-[13px]">
                                                        {loading && isDataMissing ? (
                                                            <span className="flex gap-1 items-center py-1">
                                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                                                            </span>
                                                        ) : isEmpty ? (
                                                            <span className="text-amber-600 font-medium italic bg-amber-50 px-1.5 py-0.5 rounded">Not Found</span>
                                                        ) : (
                                                            // Render the displayValue (Yes/No/String/etc)
                                                            <span className="font-medium text-gray-800">{String(displayValue ?? "")}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right text-gray-400 font-mono text-[11px]">
                                                    {pageNo}
                                                </td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}