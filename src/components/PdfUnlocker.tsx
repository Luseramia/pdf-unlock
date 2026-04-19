import React, { useState, useRef } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertCircle, LockOpen } from 'lucide-react';
import { decryptPDF as decrypt, isEncrypted } from '@localonlytools/pdf-decrypt';
import { PDFDocument } from 'pdf-lib';

export const PdfUnlocker: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setError(null);
    setSuccess(false);
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUnlock = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // 2. Check if it's encrypted
      const encrypted = await isEncrypted(bytes);
      if (!encrypted) {
        throw new Error('This PDF is not encrypted or does not require a password.');
      }

      // 3. Decrypt the PDF using @localonlytools/pdf-decrypt
      const decryptedBytes = await decrypt(bytes, password);

      // 4. Load the decrypted bytes into pdf-lib to ensure valid structure
      // pdf-lib will throw if the PDF is corrupt or still encrypted
      const pdfDoc = await PDFDocument.load(decryptedBytes);
      
      // 5. Save the unencrypted PDF structure
      const savedBytes = await pdfDoc.save();

      // 6. Trigger download
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `unlocked_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setPassword('');
      
    } catch (err: any) {
      console.error("Unlock error:", err);
      if (err.message.includes('Invalid password') || err.message.toLowerCase().includes('password')) {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || 'Failed to unlock PDF. The file might be corrupted or uses an unsupported encryption format.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-panel">
      <div className="header">
        <h1><LockOpen size={32} /> Unlock PDF</h1>
        <p>Remove passwords securely in your browser.</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          <div>PDF unlocked successfully! Your download should start automatically.</div>
        </div>
      )}

      <div 
        className={`file-drop-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".pdf" 
          onChange={handleChange} 
          style={{ display: 'none' }} 
        />
        
        {file ? (
          <>
            <FileType size={48} className="file-icon" />
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </>
        ) : (
          <>
            <UploadCloud size={48} className="file-icon" />
            <div className="file-info">
              <span className="file-name">Click or drag PDF here</span>
              <span className="file-size">File never leaves your device</span>
            </div>
          </>
        )}
      </div>

      <div className="input-group">
        <label htmlFor="password">Document Password</label>
        <input 
          id="password"
          type="password" 
          placeholder="Enter password..." 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="password-input"
          onKeyDown={(e) => e.key === 'Enter' && !!file && !!password && !isProcessing && handleUnlock()}
        />
      </div>

      <button 
        className="btn" 
        onClick={handleUnlock}
        disabled={!file || !password || isProcessing}
      >
        {isProcessing ? (
          <><div className="loader"></div> Unlocking...</>
        ) : (
          <><LockOpen size={20} /> Unlock & Download</>
        )}
      </button>
    </div>
  );
};
