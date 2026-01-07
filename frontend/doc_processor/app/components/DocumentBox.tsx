"use client";
import { useState } from "react";
const apiUrl = process.env.NEXT_PUBLIC_API_URL

export default function DocumentBox({ onRemove }: { onRemove: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);

    const handleProcess = async () => {
        if (!file) return;
        setLoading(true);
        setResult(""); // Clear previous results

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${apiUrl}/extract`, {
                method: "POST",
                body: formData,
            });

            if (!response.body) return;

            // START STREAMING LOGIC
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                // Convert the bytes (Uint8Array) into a string
                const chunk = decoder.decode(value, { stream: true });

                // Now 'chunk' is "{"winner":..." instead of "123, 34..."
                setResult((prev) => prev + chunk);
            }
        } catch (error) {
            console.error("Streaming failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border rounded-xl shadow-sm bg-white relative">
            <button onClick={onRemove} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">✕</button>

            <label
                htmlFor={`file-input-${file?.name || 'new'}`} // Match the input ID
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                }}
                className="block border-2 border-dotted border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-300 transition-colors"
            >
                {file ? (
                    <p className="font-semibold text-blue-600">{file.name}</p>
                ) : (
                    <p>Drag and drop a PDF here or <span className="text-blue-500 underline">click to select</span></p>
                )}

                <input
                    type="file"
                    accept="application/pdf" // Restrict to PDFs
                    className="hidden" // Keep it hidden
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    id={`file-input-${file?.name || 'new'}`} // Ensure this matches htmlFor
                />
            </label>

            <button
                onClick={handleProcess}
                disabled={!file || loading}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg disabled:bg-gray-300"
            >
                {loading ? "Processing..." : "Process Document"}
            </button>

            {result && (
                <div className="mt-4 p-4 bg-gray-50 rounded border text-sm font-mono whitespace-pre-wrap">
                    {result}
                </div>
            )}
        </div>
    );
}