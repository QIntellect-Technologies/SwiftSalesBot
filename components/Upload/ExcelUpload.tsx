
import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Database,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

const ExcelUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadStats, setUploadStats] = useState({ added: 0, errors: 0, total: 0, time: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const simulateUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('idle');
    setProgress(5);
    const startTime = Date.now();

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      setProgress(20);

      const BATCH_SIZE = 50;
      let addedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
        const chunk = jsonData.slice(i, i + BATCH_SIZE);

        const payload = chunk.map((row) => {
          const price = parseFloat(row['Price (Rs.)'] || row['Price'] || '0');
          // Format expected: Product ID, Medicine Name, Pack Size, Category, Company, Price (Rs.), Stock Status
          return {
            name: row['Medicine Name'] || row['Name'] || 'Unknown',
            manufacturer: row['Company'] || row['Manufacturer'] || 'Unknown',
            price: price,
            cost_price: price * 0.8, // Estimate
            stock: row['Stock Status'] === 'In Stock' || row['Stock'] === 'In Stock' ? 100 : 0,
            reorder_level: 10,
            package_size: row['Pack Size'] || row['Package Size'] || 'N/A',
            batch_number: row['Product ID']?.toString() || `BCH-${Math.floor(Math.random() * 10000)}`,
            expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
            generic_name: row['Category'] || 'General',
            status: row['Stock Status'] || 'Available',
            image_url: `https://picsum.photos/seed/${encodeURIComponent(row['Medicine Name'] || 'Medicine')}/200/200`
          };
        });

        const { error } = await supabase.from('medicines').insert(payload);

        if (error) {
          console.error('Error inserting chunk:', error.message, error.details, error.hint);
          errorCount += chunk.length;
        } else {
          addedCount += chunk.length;
        }

        setProgress(20 + Math.floor(((i + BATCH_SIZE) / jsonData.length) * 80));
      }

      const duration = (Date.now() - startTime) / 1000;
      setProgress(100);
      setUploading(false);
      setStatus('success');
      setUploadStats({ added: addedCount, errors: errorCount, total: jsonData.length, time: duration });
    } catch (error) {
      console.error('File parsing error', error);
      setUploading(false);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Bulk Data Upload</h1>
        <p className="text-slate-500">Import your inventory records quickly using Excel or CSV files.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div className="font-bold text-slate-800">Support Files</div>
            <div className="text-xs text-slate-500">.xlsx, .csv, .xls</div>
          </div>
        </div>
        <div className="glass p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="font-bold text-slate-800">Auto Mapping</div>
            <div className="text-xs text-slate-500">Intelligent Field Matching</div>
          </div>
        </div>
        <div className="glass p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
            <Database size={24} />
          </div>
          <div>
            <div className="font-bold text-slate-800">Real-time Sync</div>
            <div className="text-xs text-slate-500">Instant Database Update</div>
          </div>
        </div>
      </div>

      <div
        className={`glass p-12 rounded-[40px] border-2 border-dashed transition-all duration-300 ${dragActive ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-slate-200'
          }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <Upload size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {file ? file.name : 'Drag & drop your file here'}
          </h2>
          <p className="text-slate-500 mb-8 max-w-sm">
            Make sure your file follows the standard template format for medicine inventory.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            className="hidden"
            accept=".xlsx,.xls,.csv"
          />

          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-3 rounded-2xl font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Browse Files
            </button>
            {file && !uploading && status !== 'success' && (
              <button
                onClick={simulateUpload}
                className="px-8 py-3 rounded-2xl font-bold bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                Upload Now <ArrowRight size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {uploading && (
        <div className="glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center animate-spin">
                <Upload size={20} />
              </div>
              <div>
                <div className="font-bold text-slate-800">Processing file...</div>
                <div className="text-xs text-slate-500">Validating records and mapping fields</div>
              </div>
            </div>
            <div className="text-lg font-bold text-blue-600">{progress}%</div>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="glass p-8 rounded-3xl border-emerald-100 bg-emerald-50/20 animate-in fade-in zoom-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-800">Upload Successful!</h3>
                <button onClick={() => setStatus('idle')} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <p className="text-slate-600 mb-6">Successfully processed {uploadStats.total} records. Your inventory has been updated.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/50 p-3 rounded-xl">
                  <div className="text-xs text-slate-400">Added</div>
                  <div className="text-lg font-bold text-slate-800">{uploadStats.added}</div>
                </div>
                <div className="bg-white/50 p-3 rounded-xl">
                  <div className="text-xs text-slate-400">Updated</div>
                  <div className="text-lg font-bold text-slate-800">0</div>
                </div>
                <div className="bg-white/50 p-3 rounded-xl">
                  <div className="text-xs text-slate-400">Errors</div>
                  <div className={`text-lg font-bold ${uploadStats.errors > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{uploadStats.errors}</div>
                </div>
                <div className="bg-white/50 p-3 rounded-xl">
                  <div className="text-xs text-slate-400">Duration</div>
                  <div className="text-lg font-bold text-slate-800">{uploadStats.time.toFixed(1)}s</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="text-sm font-bold text-emerald-600 hover:underline flex items-center gap-1">
                  View Upload Log <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setStatus('idle')}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;
