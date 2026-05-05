import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, Plus, X, Image as ImageIcon } from 'lucide-react';

const Melinda = () => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0); // New state for upload progress
  const [caption, setCaption] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const MAX_SIZE = 10 * 1024 * 1024;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);

    // Basic image validation
    if (!selectedFile.type.startsWith('image/')) {
      setError("Invalid file type.");
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setError("Image too large (Max 10MB).");
      return;
    }

    setPreview(URL.createObjectURL(selectedFile));
    setStatus('uploading');

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post('http://localhost:8000/api/v1/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setProgress(percentCompleted);
        },
      });

      const { data } = response.data; // Axios wraps everything in a .data object

      if (data.caption) {
        setCaption(data.caption);
        setStatus('done');
        return;
      }

      setupSSE(data.jobId);
      setStatus('processing');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || "Upload failed";
      setError(message);
      setStatus('idle');
      setPreview("");
    }
  };

  const setupSSE = (jobId: string) => {
    const eventSource = new EventSource(`http://localhost:8000/api/v1/status/${jobId}`);

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.status === 'completed') {
        setCaption(data.result || data.caption || data.returnvalue);
        setStatus('done');
        eventSource.close();
      }
      if (data.status === 'failed') {
        setError("Processing failed.");
        setStatus('idle');
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setError("Connection lost.");
      setStatus('idle');
    };
  };

  const reset = () => {
    setPreview("");
    setStatus('idle');
    setCaption("");
    setError(null);
    setProgress(0);
  };

  return (
      <div className="min-h-screen bg-[#1a1a1c] text-[#d1d1d1] font-sans antialiased">
        <nav className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#141415]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#990000] rotate-45" />
            <h1 className="text-[11px] font-bold uppercase tracking-[0.5em] text-white/90">
              Eye of Melinda
            </h1>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto py-16 px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

          <div className="relative">
            {!preview ? (
                <label className={`aspect-square w-full flex flex-col items-center justify-center border transition-all cursor-pointer rounded-sm ${error ? 'border-[#990000]/40 bg-[#1a1212]' : 'border-white/10 bg-[#212123] hover:bg-[#252527] hover:border-white/20'}`}>
                  <Plus size={20} className={`mb-3 ${error ? 'text-[#990000]' : 'text-white/10'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 text-center px-4">
                {error ? error : "Select Source"}
              </span>
                  <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                </label>
            ) : (
                <div className="relative overflow-hidden rounded-sm ring-1 ring-white/10">
                  <img
                      src={preview}
                      alt="Source"
                      className={`w-full aspect-square object-cover transition-all duration-[1.5s] ${status === 'done' ? 'brightness-100' : 'brightness-50 grayscale'}`}
                  />
                  {status !== 'done' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <Loader2 className="w-5 h-5 animate-spin text-[#990000] mb-3" />
                        <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                    {status === 'uploading' ? `Uploading ${progress}%` : 'Processing'}
                  </span>
                        {/* Visual Progress Bar */}
                        {status === 'uploading' && (
                            <div className="w-24 h-[1px] bg-white/10 mt-4 overflow-hidden">
                              <div
                                  className="h-full bg-[#990000] transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                              />
                            </div>
                        )}
                      </div>
                  )}
                  <button
                      onClick={reset}
                      className="absolute top-4 right-4 w-8 h-8 bg-black/60 hover:bg-[#990000] text-white flex items-center justify-center transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {status === 'done' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
                  <div className="w-12 h-[1px] bg-[#990000]" />
                  <h2 className="text-3xl font-light text-white leading-tight italic">
                    "{caption}"
                  </h2>
                  <button
                      onClick={reset}
                      className="w-fit text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors border-b border-white/10 pb-1"
                  >
                    New Session
                  </button>
                </div>
            ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 opacity-20">
                    <ImageIcon size={18} />
                    <div className="h-px flex-1 bg-white" />
                  </div>
                  <p className="text-sm text-white/30 leading-relaxed max-w-sm">
                    Awaiting visual input. Once provided, the system will generate a contextual interpretation.
                  </p>
                </div>
            )}
          </div>
        </main>
      </div>
  );
};

export default Melinda;