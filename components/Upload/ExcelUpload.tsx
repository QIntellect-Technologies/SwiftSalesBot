import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertCircle, X, ArrowRight,
  Database, Eye, EyeOff, RefreshCw, ChevronDown, AlertTriangle,
  FileX, Loader2
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface CsvRow {
  product_id: string;
  medicine_name: string;
  pack_size: string;
  category: string;
  company: string;
  price: string;
  stock_status: string;
}

interface ValidationError {
  row: number;
  product_id: string;
  reason: string;
}

interface UploadResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
  total: number;
}

// Required CSV column headers — must match exactly (case-insensitive after trim)
const REQUIRED_COLUMNS = ['Product ID', 'Medicine Name', 'Pack Size', 'Category', 'Company', 'Price (Rs.)', 'Stock Status'];

// ── CSV Parser ─────────────────────────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  return lines.map(line => {
    const cols: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  });
}

// ── Main Component ─────────────────────────────────────────────────────────
const ExcelUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string>('');
  const [validRows, setValidRows] = useState<CsvRow[]>([]);
  const [rowErrors, setRowErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [dupMode, setDupMode] = useState<'upsert' | 'skip'>('upsert');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [stage, setStage] = useState<'idle' | 'parsed' | 'done' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File processing ──────────────────────────────────────────────────────
  const processFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setParseError('');
    setValidRows([]);
    setRowErrors([]);
    setStage('idle');
    setShowPreview(false);

    if (!f.name.toLowerCase().endsWith('.csv')) {
      setParseError('Invalid file type. Please upload a .csv file only.');
      setStage('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCsv(text);
        if (rows.length < 2) { setParseError('File is empty or has no data rows.'); setStage('error'); return; }

        // Validate header
        const header = rows[0].map(h => h.replace(/^#/, '').trim());
        const missingCols = REQUIRED_COLUMNS.filter(req =>
          !header.some(h => h.toLowerCase() === req.toLowerCase())
        );
        if (missingCols.length > 0) {
          setParseError(`Missing required columns: ${missingCols.join(', ')}`);
          setStage('error');
          return;
        }

        // Build column index map
        const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxMap = {
          serial: 0,
          product_id: idx('Product ID'),
          medicine_name: idx('Medicine Name'),
          pack_size: idx('Pack Size'),
          category: idx('Category'),
          company: idx('Company'),
          price: idx('Price (Rs.)'),
          stock_status: idx('Stock Status'),
        };

        const valid: CsvRow[] = [];
        const errors: ValidationError[] = [];

        rows.slice(1).forEach((cols, i) => {
          const rowNum = i + 2;
          const rowErrors: string[] = [];
          const get = (k: keyof typeof idxMap) => (cols[idxMap[k]] || '').trim();

          const product_id = get('product_id');
          const medicine_name = get('medicine_name');
          const pack_size = get('pack_size');
          const category = get('category');
          const company = get('company');
          const price = get('price');
          const stock_status = get('stock_status');

          if (!medicine_name) rowErrors.push('Medicine Name is empty');
          if (!product_id) rowErrors.push('Product ID is empty');
          if (!company) rowErrors.push('Company is empty');
          if (isNaN(parseFloat(price)) || parseFloat(price) < 0)
            rowErrors.push(`Price "${price}" is not a valid number`);
          if (!['In Stock', 'Out of Stock'].includes(stock_status))
            rowErrors.push(`Stock Status "${stock_status}" must be "In Stock" or "Out of Stock"`);

          if (rowErrors.length > 0) {
            errors.push({ row: rowNum, product_id: product_id || `Row ${rowNum}`, reason: rowErrors.join('; ') });
          } else {
            valid.push({ product_id, medicine_name, pack_size, category, company, price, stock_status });
          }
        });

        setValidRows(valid);
        setRowErrors(errors);
        setStage('parsed');
      } catch (err) {
        setParseError('Failed to parse CSV file. Please check the file format.');
        setStage('error');
      }
    };
    reader.readAsText(f);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleReset = () => {
    setFile(null); setValidRows([]); setRowErrors([]);
    setParseError(''); setResult(null); setStage('idle');
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (validRows.length === 0) return;
    setUploading(true);
    try {
      const data = await apiFetch<any>('/api/inventory/upload', {
        method: 'POST',
        body: JSON.stringify({ rows: validRows, mode: dupMode }),
      });

      setResult({
        inserted: data.inserted || 0,
        updated: data.updated || 0,
        skipped: data.skipped || 0,
        errors: [...rowErrors, ...(data.errors || [])],
        total: validRows.length + rowErrors.length,
      });
      setStage('done');
    } catch (err: any) {
      setParseError(err.message || 'Upload failed. Is the backend server running?');
      setStage('error');
    } finally {
      setUploading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">CSV Inventory Upload</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Upload a CSV file to add or update your medicine inventory in real-time.</p>
      </div>

      {/* Feature Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <FileText size={20} />, label: 'CSV Only', sub: 'Strict .csv format validation', color: 'blue' },
          { icon: <CheckCircle2 size={20} />, label: 'Row Validation', sub: 'Price, columns, status checks', color: 'emerald' },
          { icon: <Database size={20} />, label: 'Live Database Sync', sub: 'SQLite — real-time storage', color: 'purple' },
        ].map(pill => (
          <div key={pill.label} className="glass p-5 rounded-3xl flex items-center gap-4 border dark:border-white/5">
            <div className={`w-11 h-11 bg-${pill.color}-100 dark:bg-${pill.color}-900/30 text-${pill.color}-600 dark:text-${pill.color}-400 rounded-2xl flex items-center justify-center flex-shrink-0`}>
              {pill.icon}
            </div>
            <div>
              <div className="font-black text-slate-800 dark:text-white text-sm">{pill.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{pill.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Required Columns Info */}
      <div className="glass p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10">
        <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-2">Required CSV Columns</p>
        <div className="flex flex-wrap gap-2">
          {REQUIRED_COLUMNS.map(col => (
            <span key={col} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold">
              {col}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Stock Status must be exactly <strong>"In Stock"</strong> or <strong>"Out of Stock"</strong>. Price must be numeric.
        </p>
      </div>

      {/* Drop Zone */}
      {stage === 'idle' || stage === 'error' ? (
        <div
          className={`glass p-14 rounded-[40px] border-2 border-dashed transition-all duration-300 ${
            dragActive ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 scale-[1.01]' : 'border-slate-200 dark:border-white/10'
          }`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
              stage === 'error' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 animate-bounce'
            }`}>
              {stage === 'error' ? <FileX size={36} /> : <Upload size={36} />}
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-1">
              {file ? file.name : 'Drop your CSV file here'}
            </h2>
            {parseError ? (
              <p className="text-rose-500 font-bold text-sm mt-2 max-w-md">{parseError}</p>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-sm">
                Only <strong>.csv</strong> files are accepted. Make sure columns match the template above.
              </p>
            )}
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleChange} className="hidden" />
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                Browse Files
              </button>
              {parseError && (
                <button onClick={handleReset} className="px-6 py-3 rounded-2xl font-bold text-rose-600 border border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all flex items-center gap-2">
                  <RefreshCw size={16} /> Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Parsed Results Panel */}
      {stage === 'parsed' && (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
          {/* Parse Summary */}
          <div className="glass p-6 rounded-3xl border dark:border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">
                  📄 {file?.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  File parsed successfully. Review before uploading.
                </p>
              </div>
              <button onClick={handleReset} className="text-slate-400 hover:text-rose-500 transition-colors p-2">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black text-emerald-600">{validRows.length}</div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mt-1">Valid Rows</div>
              </div>
              <div className={`${rowErrors.length > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-slate-50 dark:bg-white/5'} p-4 rounded-2xl text-center`}>
                <div className={`text-2xl font-black ${rowErrors.length > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{rowErrors.length}</div>
                <div className={`text-xs font-bold uppercase tracking-wider mt-1 ${rowErrors.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>Invalid Rows</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black text-blue-600">{validRows.length + rowErrors.length}</div>
                <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mt-1">Total Rows</div>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {rowErrors.length > 0 && (
            <div className="glass p-6 rounded-3xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-900/10">
              <h4 className="font-black text-rose-600 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                <AlertTriangle size={14} /> {rowErrors.length} Row(s) Failed Validation — Will Be Skipped
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {rowErrors.map((err, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-white/60 dark:bg-slate-900/40 rounded-xl">
                    <span className="text-xs font-black text-rose-500 flex-shrink-0">Row {err.row}</span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">{err.product_id && <strong>{err.product_id}: </strong>}{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table Toggle */}
          {validRows.length > 0 && (
            <div className="glass rounded-3xl border dark:border-white/5 overflow-hidden">
              <button
                onClick={() => setShowPreview(p => !p)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                  {showPreview ? <EyeOff size={18} className="text-blue-500" /> : <Eye size={18} className="text-blue-500" />}
                  {showPreview ? 'Hide Preview' : 'Preview Data'} — First {Math.min(validRows.length, 20)} Rows
                </span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
              </button>

              {showPreview && (
                <div className="overflow-x-auto border-t border-slate-100 dark:border-white/5">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {['#', 'Product ID', 'Medicine Name', 'Pack Size', 'Category', 'Company', 'Price (Rs.)', 'Stock Status'].map(h => (
                          <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {validRows.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-white/70 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200">{row.product_id}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-white max-w-[200px] truncate">{row.medicine_name}</td>
                          <td className="px-4 py-2.5 text-slate-500">{row.pack_size}</td>
                          <td className="px-4 py-2.5 text-slate-500">{row.category}</td>
                          <td className="px-4 py-2.5 text-slate-500">{row.company}</td>
                          <td className="px-4 py-2.5 font-bold text-emerald-600">Rs. {row.price}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase ${
                              row.stock_status === 'In Stock'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'
                            }`}>
                              {row.stock_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 20 && (
                    <p className="text-center text-xs text-slate-400 py-3 border-t border-slate-100 dark:border-white/5">
                      ...and {validRows.length - 20} more rows
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Duplicate Mode & Upload */}
          {validRows.length > 0 && (
            <div className="glass p-6 rounded-3xl border dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">
                  Duplicate Handling
                </label>
                <div className="flex gap-3">
                  {[
                    { val: 'upsert', label: 'Update if exists', icon: '🔄' },
                    { val: 'skip', label: 'Skip if exists', icon: '⏭️' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setDupMode(opt.val as 'upsert' | 'skip')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                        dupMode === opt.val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || validRows.length === 0}
                className="flex items-center gap-3 px-10 py-4 rounded-3xl font-black text-sm bg-blue-600 text-white shadow-2xl shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {uploading ? (
                  <><Loader2 size={20} className="animate-spin" /> Uploading...</>
                ) : (
                  <>Confirm & Upload {validRows.length} Records <ArrowRight size={20} /></>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Result */}
      {stage === 'done' && result && (
        <div className="glass p-8 rounded-[40px] border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-900/10 animate-in fade-in zoom-in duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Upload Complete!</h3>
                <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Processed {result.total} records. Your database has been updated.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Inserted', val: result.inserted, color: 'emerald' },
                  { label: dupMode === 'upsert' ? 'Updated' : 'Skipped', val: dupMode === 'upsert' ? result.updated : result.skipped, color: 'blue' },
                  { label: 'Failed', val: result.errors.length, color: result.errors.length > 0 ? 'rose' : 'slate' },
                  { label: 'Total', val: result.total, color: 'slate' },
                ].map(s => (
                  <div key={s.label} className="bg-white/60 dark:bg-white/5 p-4 rounded-2xl text-center">
                    <div className={`text-2xl font-black ${s.color === 'rose' && s.val > 0 ? 'text-rose-500' : s.color === 'emerald' ? 'text-emerald-600' : s.color === 'blue' ? 'text-blue-600' : 'text-slate-700 dark:text-white'}`}>
                      {s.val}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {result.errors.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <AlertCircle size={12} /> {result.errors.length} Failed Rows
                  </p>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex gap-3 items-start p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl">
                        <span className="text-xs font-black text-rose-500 flex-shrink-0">Row {err.row}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{err.product_id && <strong>{err.product_id}: </strong>}{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleReset}
                  className="bg-emerald-600 text-white px-8 py-2.5 rounded-2xl text-sm font-black hover:bg-emerald-700 transition-all"
                >
                  Upload Another File
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
