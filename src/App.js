import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Tesseract from 'tesseract.js';
import './App.css';
import logo from './logo.png';

import { 
  containerVariants, 
  itemVariants, 
  hoverLift, 
  tapShrink, 
  iconHover,
  modalOverlayVariants,
  modalContentVariants
} from './animations';

const HardwareScannerListener = ({ onScanSuccess }) => {
  const scanBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return;
      const currentTime = Date.now();
      if (currentTime - lastKeyTime.current > 50) scanBuffer.current = '';
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        const finalString = scanBuffer.current.trim();
        if (finalString.length === 10 || finalString.length === 13) onScanSuccess(finalString);
        scanBuffer.current = ''; 
        return;
      }
      if (e.key.length === 1 && /\d/.test(e.key)) scanBuffer.current += e.key;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScanSuccess]);

  return null;
};

const VisionAIPlugin = ({ onProcessImage }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera access denied or unavailable:", err);
      }
    };
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      
      setCapturedImage(imageData);
      setIsAnalyzing(true);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      onProcessImage(imageData);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div className="camera-placeholder" style={{ padding: 0, backgroundColor: '#000' }}>
        {!capturedImage && <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {capturedImage && isAnalyzing && (
          <>
            <img src={capturedImage} alt="Captured cover" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            <div className="scan-line vision-scan-line"></div>
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '30px', display: 'block', textAlign: 'center' }}>🤖</span>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>Extracting Text...</p>
            </div>
          </>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      {!isAnalyzing && <button className="btn btn-submit" style={{ backgroundColor: '#a855f7' }} onClick={takePicture}>📷 Capture Cover</button>}
    </div>
  );
}; 

function App() {
  const [catalogueName, setCatalogueName] = useState(() => {
    const savedName = localStorage.getItem('libScanNGo_name');
    return savedName ? JSON.parse(savedName) : 'Library Catalogue';
  });

  const [books, setBooks] = useState(() => {
    const savedBooks = localStorage.getItem('libScanNGo_books');
    if (savedBooks) {
      try { return JSON.parse(savedBooks); } catch (e) { return []; }
    }
    return [];
  }); 

  const [ownerPassword, setOwnerPassword] = useState(() => {
    const savedPass = localStorage.getItem('libScanNGo_pass');
    return savedPass ? JSON.parse(savedPass) : null;
  });

  const [pendingAction, setPendingAction] = useState(null); 
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  
  // --- NEW: OWNER VIEW STATE ---
  const [isOwnerView, setIsOwnerView] = useState(false);

  useEffect(() => {
    localStorage.setItem('libScanNGo_pass', JSON.stringify(ownerPassword));
  }, [ownerPassword]);

  useEffect(() => {
    localStorage.setItem('libScanNGo_books', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('libScanNGo_name', JSON.stringify(catalogueName));
  }, [catalogueName]);

  const [searchQuery, setSearchQuery] = useState(''); 
  const [activeModal, setActiveModal] = useState(null); 
  
  const [isbnInput, setIsbnInput] = useState('');
  const [barcodeVerification, setBarcodeVerification] = useState(null); 
  const [selectedBook, setSelectedBook] = useState(null);
  const [modalError, setModalError] = useState('');
  const [ocrProgress, setOcrProgress] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [visionQuery, setVisionQuery] = useState('');      
  const [visionResults, setVisionResults] = useState([]);  
  const [isSearchingVision, setIsSearchingVision] = useState(false);
  
  const [manualQuery, setManualQuery] = useState('');
  const [manualSearchType, setManualSearchType] = useState('intitle'); 
  const [manualResults, setManualResults] = useState([]);
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  
  const [sortBy, setSortBy] = useState('custom'); 
  const [groupBySeries, setGroupBySeries] = useState(false);
  const [draggedBookId, setDraggedBookId] = useState(null);

  const [tagInput, setTagInput] = useState('');
  const [seriesInput, setSeriesInput] = useState('');
  
  const [lendForm, setLendForm] = useState({ name: '', email: '', checkoutDate: new Date().toISOString().split('T')[0], dueDate: '' });
  
  const fileInputRef = useRef(null);
  const triggerFileSelect = () => fileInputRef.current.click();

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        let importedBooks = [];
        
        if (importedData && typeof importedData === 'object' && !Array.isArray(importedData) && 'books' in importedData) {
          if (importedData.catalogueName) setCatalogueName(importedData.catalogueName);
          importedBooks = Array.isArray(importedData.books) ? importedData.books : [importedData.books];
        } else {
          importedBooks = Array.isArray(importedData) ? importedData : [importedData];
        }

        const sanitizedBooks = importedBooks.map(book => ({
          ...book,
          localMeta: {
            quantity: book.localMeta?.quantity || 1,
            available: book.localMeta?.available ?? 1,
            dateAdded: book.localMeta?.dateAdded || Date.now(),
            tags: book.localMeta?.tags || [],
            series: book.localMeta?.series || '',
            loans: book.localMeta?.loans || [] 
          }
        }));
        setBooks(sanitizedBooks);
      } catch (err) {
        alert("Failed to parse JSON. Ensure it matches the correct app catalogue format.");
      }
    };
    reader.readAsText(file);
    event.target.value = null; 
  };

  const handleExport = () => {
    const exportData = { catalogueName: catalogueName.trim() || 'Library Catalogue', books: books };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const safeTitle = catalogueName.trim().replace(/[^a-zA-Z0-9-_]/g, '_') || 'Library_Catalogue';
    const fileName = `${safeTitle}_${dateStr}_${timeStr}.json`;

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const resetLibrary = () => {
    if (window.confirm("Are you sure you want to wipe your local data? Make sure you have exported a backup first!")) {
      requestProtectedAction({ type: 'RESET_LIBRARY' });
    }
  };

  const executeReset = () => {
    localStorage.removeItem('libScanNGo_books');
    localStorage.removeItem('libScanNGo_name');
    localStorage.removeItem('libScanNGo_pass');
    setBooks([]);
    setCatalogueName('Library Catalogue');
    setOwnerPassword(null);
    setIsOwnerView(false);
  };

  const confirmAndAddBook = (fetchedBook) => {
    setBooks(prevBooks => {
      const existingIndex = prevBooks.findIndex(b => b.id === fetchedBook.id);
      if (existingIndex >= 0) {
        const updatedBooks = [...prevBooks];
        const meta = updatedBooks[existingIndex].localMeta || {};
        updatedBooks[existingIndex].localMeta = {
          ...meta,
          quantity: (meta.quantity || 1) + 1,
          available: (meta.available ?? 1) + 1
        };
        return updatedBooks;
      } else {
        return [{
          ...fetchedBook,
          localMeta: { quantity: 1, available: 1, dateAdded: Date.now(), tags: [], series: '', loans: [] }
        }, ...prevBooks];
      }
    });
    closeModal();
  };

  const fetchBookByISBN = async (isbn) => {
    setModalError(''); 
    if (!isbn.trim()) { setModalError("Please enter an ISBN first."); return; }
    
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
      const data = await response.json();

      if (data.totalItems > 0) {
        setBarcodeVerification(data.items[0]);
      } else {
        setModalError(`No book found for barcode: ${isbn}`);
      }
    } catch (error) {
      console.error(error);
      setModalError("Failed to connect to the Google Books API.");
    }
  };

  const handleGlobalScan = (scannedIsbn) => {
    if (!isOwnerView) return; // Prevent scanning if not owner
    setActiveModal('Scan Barcode');
    setIsbnInput(scannedIsbn);
    fetchBookByISBN(scannedIsbn);
  };

  const fetchBooksByText = async (query) => {
    setModalError(''); setIsSearchingVision(true); setVisionResults([]);
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}`);
      const data = await response.json();
      if (data.items?.length > 0) setVisionResults(data.items);
      else setModalError(`No books found matching: "${query}"`);
    } catch (error) {
      setModalError("Failed to connect to the Google Books API.");
    } finally {
      setIsSearchingVision(false);
    }
  };

  const fetchBooksManual = async () => {
    setModalError(''); 
    setIsSearchingManual(true); 
    setManualResults([]);
    
    if (!manualQuery.trim()) {
      setModalError("Please enter a search term.");
      setIsSearchingManual(false);
      return;
    }

    try {
      const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
      let queryString = manualQuery;
      
      if (manualSearchType === 'intitle') queryString = `intitle:${manualQuery}`;
      else if (manualSearchType === 'inauthor') queryString = `inauthor:${manualQuery}`;

      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryString)}&key=${apiKey}`);
      const data = await response.json();
      
      if (data.items?.length > 0) setManualResults(data.items);
      else setModalError(`No books found for: "${manualQuery}"`);
    } catch (error) {
      setModalError("Failed to connect to the Google Books API.");
    } finally {
      setIsSearchingManual(false);
    }
  };

  const requestProtectedAction = (actionPayload) => {
    setPendingAction(actionPayload);
    setModalError('');
    setPasswordInput('');
    setConfirmPasswordInput('');
    
    if (!ownerPassword) {
      setActiveModal('Set Owner Password');
    } else {
      setActiveModal('Enter Owner Password');
    }
  };

  const handleSetPassword = () => {
    if (!passwordInput.trim()) { setModalError("Password cannot be empty."); return; }
    if (passwordInput !== confirmPasswordInput) { setModalError("Passwords do not match."); return; }
    
    setOwnerPassword(passwordInput);
    executePendingAction();
  };

  const handleVerifyPassword = () => {
    if (passwordInput === ownerPassword) {
      executePendingAction();
    } else {
      setModalError("Incorrect password.");
    }
  };

  const executePendingAction = () => {
    if (!pendingAction) { closeModal(); return; }
    
    if (pendingAction.type === 'ENTER_OWNER_VIEW') {
      setIsOwnerView(true);
      setActiveModal(null);
    } else if (pendingAction.type === 'VIEW_LOANS') {
      setActiveModal('Active Loans');
    } else if (pendingAction.type === 'DELETE_BOOK') {
      deleteBook(pendingAction.id);
      setActiveModal(null); 
    } else if (pendingAction.type === 'RESET_LIBRARY') {
      executeReset();
      setActiveModal(null);
    }
    
    setPendingAction(null);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setModalError('');
  };

  const deleteBook = (id) => {
    setBooks(prevBooks => {
      const existingIndex = prevBooks.findIndex(b => b.id === id);
      if (existingIndex === -1) return prevBooks;
      const existingBook = prevBooks[existingIndex];
      const qty = existingBook.localMeta?.quantity || 1;
      const avail = existingBook.localMeta?.available ?? 1;

      if (qty > 1) {
        const updatedBooks = [...prevBooks];
        updatedBooks[existingIndex] = {
          ...existingBook,
          localMeta: { ...existingBook.localMeta, quantity: qty - 1, available: Math.max(0, avail - 1) }
        };
        return updatedBooks;
      } else {
        return prevBooks.filter(book => book.id !== id);
      }
    });
  };

  const updateBookMeta = (id, newMetaOverrides) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, localMeta: { ...b.localMeta, ...newMetaOverrides } } : b));
    if (selectedBook && selectedBook.id === id) {
      setSelectedBook(prev => ({ ...prev, localMeta: { ...prev.localMeta, ...newMetaOverrides } }));
    }
  };

  const handleLendSubmit = (e) => {
    e.preventDefault();
    if (!lendForm.name.trim() || !lendForm.email.trim()) {
      setModalError("Name and Email are required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lendForm.email)) {
      setModalError("Please enter a valid email address.");
      return;
    }

    const newLoan = {
      id: Date.now().toString(),
      name: lendForm.name.trim(),
      email: lendForm.email.trim(),
      checkoutDate: lendForm.checkoutDate,
      dueDate: lendForm.dueDate || null,
      returned: false
    };

    updateBookMeta(selectedBook.id, {
      available: (selectedBook.localMeta.available || 1) - 1,
      loans: [...(selectedBook.localMeta.loans || []), newLoan]
    });

    closeModal();
  };

  const handleReturnBook = (bookId, loanId) => {
    if (!isOwnerView) return;
    setBooks(prevBooks => prevBooks.map(b => {
      if (b.id !== bookId) return b;
      const updatedLoans = (b.localMeta.loans || []).map(loan => 
        loan.id === loanId ? { ...loan, returned: true, returnedDate: new Date().toISOString().split('T')[0] } : loan
      );
      return {
        ...b,
        localMeta: {
          ...b.localMeta,
          loans: updatedLoans,
          available: (b.localMeta.available || 0) + 1
        }
      };
    }));
  };

  const processedDisplayList = () => {
    const search = searchQuery.toLowerCase();
    
    let filtered = books.filter((book) => {
      if (!search) return true;
      const info = book.volumeInfo;
      const meta = book.localMeta || {};
      const title = info.title?.toLowerCase() || '';
      const author = info.authors?.join(' ').toLowerCase() || '';
      const desc = info.description?.toLowerCase() || '';
      const tags = meta.tags?.join(' ').toLowerCase() || '';
      const series = meta.series?.toLowerCase() || '';
      return title.includes(search) || author.includes(search) || desc.includes(search) || tags.includes(search) || series.includes(search);
    });

    filtered.sort((a, b) => {
      const infoA = a.volumeInfo;
      const infoB = b.volumeInfo;
      const metaA = a.localMeta || {};
      const metaB = b.localMeta || {};

      switch (sortBy) {
        case 'title': return (infoA.title || '').localeCompare(infoB.title || '');
        case 'author': return (infoA.authors?.[0] || '').localeCompare(infoB.authors?.[0] || '');
        case 'published': return new Date(infoB.publishedDate || 0) - new Date(infoA.publishedDate || 0);
        case 'dateAdded': return (metaB.dateAdded || 0) - (metaA.dateAdded || 0);
        case 'custom': default: return 0; 
      }
    });

    if (groupBySeries) {
      const seriesGroups = {};
      filtered.forEach(b => {
        const s = b.localMeta?.series?.trim() || 'Standalone Books';
        if (!seriesGroups[s]) seriesGroups[s] = [];
        seriesGroups[s].push(b);
      });
      const finalGrouped = [];
      Object.keys(seriesGroups).sort().forEach(seriesName => {
        finalGrouped.push({ isHeader: true, id: `header-${seriesName}`, title: seriesName });
        finalGrouped.push(...seriesGroups[seriesName]);
      });
      return finalGrouped;
    }

    return filtered;
  };

  const handleDragStart = (e, id) => {
    if (sortBy !== 'custom' || groupBySeries || !isOwnerView) return;
    setDraggedBookId(id);
    e.dataTransfer.effectAllowed = "move";
    e.target.classList.add('dragging');
  };

  const handleDragOver = (e) => {
    if (sortBy !== 'custom' || groupBySeries || !isOwnerView) return;
    e.preventDefault(); 
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (sortBy !== 'custom' || groupBySeries || !isOwnerView || !draggedBookId || draggedBookId === targetId) return;

    setBooks(prevBooks => {
      const newBooks = [...prevBooks];
      const draggedIndex = newBooks.findIndex(b => b.id === draggedBookId);
      const targetIndex = newBooks.findIndex(b => b.id === targetId);
      if(draggedIndex === -1 || targetIndex === -1) return prevBooks;
      const [draggedItem] = newBooks.splice(draggedIndex, 1);
      newBooks.splice(targetIndex, 0, draggedItem);
      return newBooks;
    });
    setDraggedBookId(null);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedBookId(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setIsbnInput('');
    setBarcodeVerification(null);
    setSelectedBook(null);
    setModalError('');
    setVisionQuery('');
    setVisionResults([]);
    setOcrProgress(null);
    setTagInput('');
    setSeriesInput('');
    setManualQuery('');
    setManualResults([]);
    setLendForm({ name: '', email: '', checkoutDate: new Date().toISOString().split('T')[0], dueDate: '' });
    setPasswordInput('');
    setConfirmPasswordInput('');
    setPendingAction(null);
  };

  const openBookDetails = (book) => {
    setSelectedBook(book);
    setSeriesInput(book.localMeta?.series || '');
    setActiveModal('Book Details');
  };

  const openLendModal = (book) => {
    setSelectedBook(book);
    setLendForm({ name: '', email: '', checkoutDate: new Date().toISOString().split('T')[0], dueDate: '' });
    setActiveModal('Lend Book');
  };

  const renderModalContent = () => {
    switch (activeModal) {
      
      case 'Set Owner Password':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'center', fontSize: '30px', marginBottom: '-10px' }}>🔐</div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
              Create a password to protect borrower information and prevent accidental book deletions.
            </p>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirmPasswordInput} onChange={(e) => setConfirmPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()} />
            </div>
            {modalError && <div style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '13px', textAlign: 'center' }}>{modalError}</div>}
            <motion.button whileTap={tapShrink} className="btn btn-submit" style={{ backgroundColor: '#16a34a' }} onClick={handleSetPassword}>Save Password</motion.button>
          </div>
        );

      case 'Enter Owner Password':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'center', fontSize: '30px', marginBottom: '-10px' }}>🔒</div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
              This action requires the collection owner's password.
            </p>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()} />
            </div>
            {modalError && <div style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '13px', textAlign: 'center' }}>{modalError}</div>}
            <motion.button whileTap={tapShrink} className="btn btn-submit" style={{ backgroundColor: '#2563eb' }} onClick={handleVerifyPassword}>Unlock</motion.button>
          </div>
        );

      case 'Scan Barcode':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {barcodeVerification ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Verify Book Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '15px' }}>
                  {barcodeVerification.volumeInfo.imageLinks?.thumbnail ? (
                    <img src={barcodeVerification.volumeInfo.imageLinks.thumbnail} alt="Cover" style={{ height: '120px', borderRadius: '4px', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div style={{ width: '80px', height: '120px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', borderRadius: '4px', marginBottom: '10px' }}>📖</div>
                  )}
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{barcodeVerification.volumeInfo.title}</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>{barcodeVerification.volumeInfo.authors?.join(', ') || 'Unknown Author'}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button whileTap={tapShrink} className="btn btn-theme" style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#dc2626' }} onClick={() => setBarcodeVerification(null)}>Cancel</motion.button>
                  <motion.button whileTap={tapShrink} className="btn btn-submit" style={{ flex: 2, margin: 0, backgroundColor: '#16a34a' }} onClick={() => confirmAndAddBook(barcodeVerification)}>Confirm & Add</motion.button>
                </div>
              </motion.div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📟</div>
                <h3 style={{ margin: 0 }}>Scanner Ready</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>You don't need to click anything! Just pull the trigger on your hardware scanner to instantly process an ISBN.</p>
                
                <AnimatePresence>
                  {modalError && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '14px', textAlign: 'center', border: '1px solid #f87171', marginTop: '10px' }}>
                      <strong>Scan Failed:</strong> {modalError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '15px 0' }} />
                
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label>Manual Fallback</label>
                  <input type="text" placeholder="Or type ISBN and press Enter..." value={isbnInput} onChange={(e) => setIsbnInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchBookByISBN(isbnInput); }} autoFocus />
                </div>
                
                {isbnInput && !modalError && <p style={{ fontSize: '14px', color: '#2563eb', fontWeight: 'bold' }}>Fetching data for: {isbnInput}...</p>}
              </div>
            )}
          </div>
        );
        
      case 'Vision AI':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {!visionQuery && visionResults.length === 0 && (
              <>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Position the book cover clearly in the frame.</p>
                <VisionAIPlugin onProcessImage={async (base64Image) => {
                    setModalError(''); setOcrProgress('Initializing AI Engine...');
                    try {
                      const result = await Tesseract.recognize(base64Image, 'eng', { logger: m => { if (m.status === 'recognizing text') setOcrProgress(`Reading text: ${Math.round(m.progress * 100)}%`); else setOcrProgress("Loading language models..."); }});
                      const extractedText = result.data.text.replace(/\n/g, ' ').trim();
                      if (extractedText.length > 3) setVisionQuery(extractedText.substring(0, 100)); else setModalError("No readable text found. Try again.");
                    } catch (error) { setModalError("Vision AI processing failed."); } finally { setOcrProgress(null); }
                  }} />
              </>
            )}

            {visionQuery && visionResults.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="form-group">
                  <label>Verify Extracted Text</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 5px 0' }}>Edit any typos before searching.</p>
                  <input type="text" value={visionQuery} onChange={(e) => setVisionQuery(e.target.value)} autoFocus />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button whileTap={tapShrink} className="btn btn-theme" style={{ flex: 1 }} onClick={() => setVisionQuery('')}>Retake</motion.button>
                  <motion.button whileTap={tapShrink} className="btn btn-submit" style={{ flex: 2, margin: 0, backgroundColor: '#a855f7' }} onClick={() => fetchBooksByText(visionQuery)}>{isSearchingVision ? 'Searching...' : 'Search Google Books'}</motion.button>
                </div>
              </motion.div>
            )}

            {visionResults.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Select Correct Edition:</label>
                  <button onClick={() => setVisionResults([])} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: 0 }}>← Back to Edit</button>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
                  {visionResults.map(book => {
                    const info = book.volumeInfo;
                    return (
                      <div key={book.id} style={{ display: 'flex', gap: '10px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', alignItems: 'center' }}>
                        {info.imageLinks?.thumbnail ? <img src={info.imageLinks.thumbnail} alt="cover" style={{ width: '40px', height: '60px', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '60px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📖</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.title}</h4>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{info.authors?.join(', ') || 'Unknown'}</p>
                        </div>
                        <motion.button whileTap={tapShrink} style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', border: 'none', cursor: 'pointer' }} onClick={() => confirmAndAddBook(book)}>Add</motion.button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {ocrProgress && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', color: '#a855f7', fontWeight: 'bold', fontSize: '14px' }}>{ocrProgress}</motion.div>}
              {modalError && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '14px', textAlign: 'center', border: '1px solid #f87171' }}>{modalError}</motion.div>}
            </AnimatePresence>
          </div>
        );
        
      case 'Manual Lookup':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {manualResults.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label>Search Type</label>
                  <select value={manualSearchType} onChange={(e) => setManualSearchType(e.target.value)} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '14px' }}>
                    <option value="intitle">Book Title</option>
                    <option value="inauthor">Author Name</option>
                    <option value="general">Series / Keyword</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Search Query</label>
                  <input type="text" placeholder="Enter search term..." autoFocus value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchBooksManual(); }} />
                </div>
                {modalError && <div style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '13px', textAlign: 'center', marginBottom: '10px' }}>{modalError}</div>}
                <motion.button whileTap={tapShrink} className="btn btn-submit" style={{ backgroundColor: '#6366f1' }} onClick={fetchBooksManual}>{isSearchingManual ? 'Searching...' : 'Search Google Books'}</motion.button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Select Book to Add:</label>
                  <button onClick={() => setManualResults([])} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: 0 }}>← Back to Search</button>
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
                  {manualResults.map(book => {
                    const info = book.volumeInfo;
                    return (
                      <div key={book.id} style={{ display: 'flex', gap: '10px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', alignItems: 'center' }}>
                        {info.imageLinks?.thumbnail ? <img src={info.imageLinks.thumbnail} alt="cover" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} /> : <div style={{ width: '40px', height: '60px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', borderRadius: '4px' }}>📖</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.title}</h4>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{info.authors?.join(', ') || 'Unknown'}</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>{info.publishedDate?.substring(0, 4) || 'N/A'}</p>
                        </div>
                        <motion.button whileTap={tapShrink} style={{ backgroundColor: '#6366f1', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', border: 'none', cursor: 'pointer' }} onClick={() => confirmAndAddBook(book)}>Add</motion.button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        );
        
      case 'Manual Entry':
        return (
          <>
            <div className="form-group"><label>Book Title</label><input type="text" placeholder="Enter title" /></div>
            <div className="form-group"><label>Author(s)</label><input type="text" placeholder="Enter author names" /></div>
            <div className="form-group"><label>Category</label><input type="text" placeholder="e.g. Fiction, Science" /></div>
            <motion.button whileTap={tapShrink} className="btn btn-submit">Save to Library</motion.button>
          </>
        );

      case 'Book Details':
        if (!selectedBook) return null;
        const volumeInfo = selectedBook.volumeInfo;
        const meta = selectedBook.localMeta || { quantity: 1, available: 1, tags: [], series: '', loans: [] };
        const tags = meta.tags || [];
        
        return (
          <div className="book-detailed-view" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              {volumeInfo.imageLinks?.thumbnail ? (
                <img src={volumeInfo.imageLinks.thumbnail} alt={volumeInfo.title} style={{ width: '100px', height: '140px', objectFit: 'cover', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              ) : (
                <div className="book-cover-placeholder" style={{ width: '100px', height: '140px' }}><span>📖</span></div>
              )}
              
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', lineHeight: '1.2' }}>{volumeInfo.title}</h3>
                <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '15px' }}>
                  By {volumeInfo.authors?.join(', ') || 'Unknown Author'}
                </p>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: meta.available > 0 ? '#16a34a' : '#dc2626', backgroundColor: meta.available > 0 ? '#dcfce7' : '#fee2e2', padding: '4px 10px', borderRadius: '20px', border: meta.available > 0 ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                    🟢 {meta.available} Available
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '20px', border: '1px solid #e5e7eb' }}>
                    📦 {meta.quantity} Total Copies
                  </span>
                </div>
                
                {volumeInfo.categories && <span className="book-badge" style={{ display: 'inline-block', marginBottom: '10px' }}>{volumeInfo.categories.join(', ')}</span>}
                
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0 }}><strong>Publisher:</strong> {volumeInfo.publisher || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Published:</strong> {volumeInfo.publishedDate || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Pages:</strong> {volumeInfo.pageCount || 'N/A'} pages</p>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--text-muted)' }}>📚 Series Collection</h4>
                {isOwnerView ? (
                  <input className="modal-meta-input" type="text" placeholder="e.g. Mistborn, The Reckoners..." value={seriesInput} onChange={(e) => setSeriesInput(e.target.value)} onBlur={() => updateBookMeta(selectedBook.id, { series: seriesInput })} onKeyDown={(e) => e.key === 'Enter' && updateBookMeta(selectedBook.id, { series: seriesInput })} />
                ) : (
                  <p style={{ fontSize: '14px', margin: 0, color: 'var(--text-main)' }}>{seriesInput || 'No series assigned'}</p>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--text-muted)' }}>🏷️ Custom Tags</h4>
                {isOwnerView ? (
                  <div className="custom-tags-container">
                    {tags.map(tag => (
                      <span key={tag} className="custom-tag-pill">
                        {tag}
                        <button onClick={() => updateBookMeta(selectedBook.id, { tags: tags.filter(t => t !== tag) })}>×</button>
                      </span>
                    ))}
                    <input className="tag-input" type="text" placeholder="Add a tag and press Enter..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { if (!tags.includes(tagInput.trim())) { updateBookMeta(selectedBook.id, { tags: [...tags, tagInput.trim()] }); } setTagInput(''); } }} />
                  </div>
                ) : (
                  <div className="custom-tags-container">
                    {tags.length > 0 ? tags.map(tag => (
                      <span key={tag} className="custom-tag-pill" style={{ paddingRight: '10px' }}>{tag}</span>
                    )) : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No custom tags</span>}
                  </div>
                )}
              </div>
            </div>
            
            {volumeInfo.description && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Description</h4>
                  <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-main)', maxHeight: '160px', overflowY: 'auto', paddingRight: '6px' }}>{volumeInfo.description}</p>
                </div>
              </>
            )}
          </div>
        );

      case 'Lend Book':
        if (!selectedBook) return null;
        return (
          <form onSubmit={handleLendSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
              {selectedBook.volumeInfo.imageLinks?.thumbnail ? (
                <img src={selectedBook.volumeInfo.imageLinks.thumbnail} alt="cover" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
              ) : (
                <div style={{ width: '40px', height: '60px', backgroundColor: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📖</div>
              )}
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Lending: {selectedBook.volumeInfo.title}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{selectedBook.localMeta?.available} copy available to lend.</p>
              </div>
            </div>

            <div className="form-group">
              <label>Borrower Name <span style={{color: '#dc2626'}}>*</span></label>
              <input type="text" required placeholder="Jane Doe" value={lendForm.name} onChange={e => setLendForm({...lendForm, name: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Borrower Email <span style={{color: '#dc2626'}}>*</span></label>
              <input type="email" required placeholder="jane@example.com" value={lendForm.email} onChange={e => setLendForm({...lendForm, email: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Checkout Date <span style={{color: '#dc2626'}}>*</span></label>
                <input type="date" required value={lendForm.checkoutDate} onChange={e => setLendForm({...lendForm, checkoutDate: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Due Date (Optional)</label>
                <input type="date" value={lendForm.dueDate} onChange={e => setLendForm({...lendForm, dueDate: e.target.value})} />
              </div>
            </div>

            {modalError && <div style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '13px', textAlign: 'center' }}>{modalError}</div>}
            
            <motion.button whileTap={tapShrink} className="btn btn-submit" type="submit" style={{ backgroundColor: '#2563eb' }}>Confirm Loan</motion.button>
          </form>
        );

      case 'Active Loans':
        const activeLoans = books.flatMap(b => 
          (b.localMeta?.loans || []).filter(loan => !loan.returned).map(loan => ({ book: b, loan }))
        );

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>Manage all books currently checked out from your library.</p>
            
            {activeLoans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', backgroundColor: 'var(--bg-app)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '30px', marginBottom: '10px' }}>📚</div>
                <p style={{ margin: 0 }}>No books are currently checked out.</p>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
                {activeLoans.map(({ book, loan }) => (
                  <div key={loan.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{book.volumeInfo.title}</h4>
                      <motion.button 
                        whileTap={tapShrink} 
                        style={{ backgroundColor: '#16a34a', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} 
                        onClick={() => handleReturnBook(book.id, loan.id)}
                      >
                        Return Book
                      </motion.button>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      <p style={{ margin: 0 }}><strong>Borrower:</strong> {loan.name}</p>
                      <p style={{ margin: 0 }}><strong>Email:</strong> {loan.email}</p>
                      <p style={{ margin: 0 }}><strong>Out:</strong> {loan.checkoutDate}</p>
                      <p style={{ margin: 0 }}><strong>Due:</strong> {loan.dueDate || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

        case 'Statistics':
        const totalUnique = books.length;
        const totalCopies = books.reduce((sum, b) => sum + (b.localMeta?.quantity || 1), 0);
        const totalAvailable = books.reduce((sum, b) => sum + (b.localMeta?.available ?? 1), 0);
        const totalLoaned = totalCopies - totalAvailable;

        // Calculate Top Categories
        const categoryCounts = {};
        books.forEach(b => {
          if (b.volumeInfo.categories) {
            b.volumeInfo.categories.forEach(cat => {
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
          }
        });
        const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

        // Calculate Top Authors
        const authorCounts = {};
        books.forEach(b => {
          if (b.volumeInfo.authors) {
            b.volumeInfo.authors.forEach(author => {
              authorCounts[author] = (authorCounts[author] || 0) + 1;
            });
          }
        });
        const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Overview of your library collection data.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{totalCopies}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Volumes</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{totalUnique}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unique Titles</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{totalLoaned}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Currently Loaned</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>{Object.keys(authorCounts).length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unique Authors</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <div style={{ flex: 1, backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Top Categories</h4>
                {topCategories.length > 0 ? topCategories.map(([cat, count]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{cat}</span>
                    <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{count}</span>
                  </div>
                )) : <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No category data.</p>}
              </div>
              
              <div style={{ flex: 1, backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Top Authors</h4>
                {topAuthors.length > 0 ? topAuthors.map(([author, count]) => (
                  <div key={author} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{author}</span>
                    <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{count}</span>
                  </div>
                )) : <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No author data.</p>}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const displayList = processedDisplayList();
  const showGhostBooks = books.length === 0 && !searchQuery;
  const ghostBookTemplates = Array.from({ length: 9 }, (_, index) => index);

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
      <HardwareScannerListener onScanSuccess={handleGlobalScan} />
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" style={{ display: 'none' }} />

      <header className="app-header">
        <div className="header-title-group">
          <img src={logo} className="logo-placeholder" alt="logo" />
          <div>
            {isOwnerView ? (
              <input 
                type="text"
                value={catalogueName}
                onChange={(e) => setCatalogueName(e.target.value)}
                placeholder="Enter Catalogue Name..."
                title="Click to edit catalogue name"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '24px', fontWeight: '600', padding: 0, margin: 0, outline: 'none', width: '100%', fontFamily: 'inherit' }}
              />
            ) : (
              <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0, color: 'var(--text-main)' }}>{catalogueName}</h1>
            )}
            <p>Manage your book collection & lending</p>
          </div>
        </div>
        <div className="header-actions">
          <motion.button whileTap={tapShrink} className="btn btn-theme" onClick={toggleDarkMode}>
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </motion.button>

          {isOwnerView ? (
            <>
              <motion.button whileTap={tapShrink} className="btn btn-export" onClick={handleExport}>↓ Export</motion.button>
              <motion.button whileTap={tapShrink} className="btn btn-import" onClick={triggerFileSelect}>↑ Import</motion.button>
              <motion.button whileTap={tapShrink} className="btn" style={{ backgroundColor: '#dc2626', color: 'white' }} onClick={resetLibrary}>Reset</motion.button>
              <motion.button whileTap={tapShrink} className="btn btn-theme" style={{ marginLeft: '10px' }} onClick={() => setIsOwnerView(false)}>🔓 Exit Owner View</motion.button>
            </>
          ) : (
            <motion.button whileTap={tapShrink} className="btn btn-theme" style={{ backgroundColor: '#2563eb', color: 'white' }} onClick={() => requestProtectedAction({ type: 'ENTER_OWNER_VIEW' })}>
              🔐 Owner Login
            </motion.button>
          )}
        </div>
      </header>

      <main className="app-main">
        {/* Only show Action Bar for adding books if Owner */}
        {isOwnerView && (
          <div className="action-bar">
            {['Scan Barcode', 'Vision AI', 'Manual Lookup', 'Manual Entry'].map((text, i) => (
              <motion.button key={text} whileHover={hoverLift} whileTap={tapShrink} className={`btn-large btn-style-${i}`} onClick={() => setActiveModal(text)} >
                {text}
              </motion.button>
            ))}
          </div>
        )}

        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search titles, authors, descriptions, or custom tags..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="organization-toolbar">
          <div className="toolbar-group">
            <label>Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} disabled={groupBySeries}>
              {isOwnerView && <option value="custom">Custom (Drag & Drop)</option>}
              <option value="title">Title (A-Z)</option>
              <option value="author">Author (A-Z)</option>
              <option value="dateAdded">Recently Added</option>
              <option value="published">Publication Date</option>
            </select>
          </div>
          
          <div className="toolbar-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={groupBySeries} onChange={(e) => {
                setGroupBySeries(e.target.checked);
                if(e.target.checked) setSortBy('title'); 
              }}/>
              Group by Series
            </label>
          </div>
        </div>

        <div className="list-header">
          <h2>{books.length} Total Books</h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            {/* Only Owner can view Active Loans */}
            {isOwnerView && (
              <button 
                className="stats-link-btn" 
                style={{background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontWeight: 'bold'}} 
                onClick={() => requestProtectedAction({ type: 'VIEW_LOANS' })}
              >
                📚 View Active Loans
              </button>
            )}
            <button 
              className="stats-link-btn" 
              style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold'}}
              onClick={() => setActiveModal('Statistics')}
            >
              📊 Show Statistics
            </button>
          </div>
        </div>

        <motion.div className="book-list" variants={containerVariants} initial="hidden" animate="show">
          <AnimatePresence mode='popLayout'>
            {showGhostBooks ? (
              ghostBookTemplates.map((index) => (
                <div key={index} className="ghost-book-card" aria-hidden="true">
                  <div className="ghost-book-cover" />
                  <div className="ghost-book-content">
                    <div className="ghost-line ghost-line-title" />
                    <div className="ghost-line ghost-line-author" />
                    <div className="ghost-line ghost-line-badge" />
                  </div>
                </div>
              ))
            ) : (
              displayList.map((item) => {
                if (item.isHeader) {
                  return (
                    <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="series-header">
                      <h3>{item.title}</h3>
                    </motion.div>
                  );
                }

                const book = item;
                const info = book.volumeInfo;
                const availableCopies = book.localMeta?.available ?? 1;
                const isDraggable = sortBy === 'custom' && !groupBySeries && isOwnerView;
                
                return (
                  <motion.div 
                    key={book.id} 
                    className={`book-card ${isDraggable ? 'draggable-card' : ''}`}
                    variants={itemVariants}
                    layout 
                    exit="exit"
                    draggable={isDraggable}
                    onDragStart={(e) => handleDragStart(e, book.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, book.id)}
                    onDragEnd={handleDragEnd}
                    whileHover={{ scale: 1.02, cursor: isDraggable ? 'grab' : 'pointer' }} 
                    onClick={() => openBookDetails(book)}
                  >
                    <div className="book-cover-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '6px', marginRight: '20px', flexShrink: 0, width: '80px', height: '100px' }}>
                      {info.imageLinks?.thumbnail ? (
                        <img src={info.imageLinks.thumbnail} alt={info.title} className="book-cover-img" style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                      ) : (
                        <div className="book-cover-placeholder" style={{ margin: 0, width: '100%', height: '100%' }}><span>📖</span></div>
                      )}
                      
                      <div className="card-hover-overlay">
                        <span className="overlay-status-dot" style={{ backgroundColor: availableCopies > 0 ? '#4ade80' : '#ef4444' }}></span>
                        {availableCopies} Available
                      </div>
                    </div>
                    
                    <div className="book-details">
                      <div className="book-title-row">
                        <h3>{info.title}</h3>
                        <div className="book-card-actions">
                          
                          <motion.button 
                          whileHover={availableCopies > 0 ? iconHover : {}} 
                          className="icon-btn" 
                          style={{ opacity: availableCopies > 0 ? 1 : 0.3, cursor: availableCopies > 0 ? 'pointer' : 'not-allowed' }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (availableCopies > 0) openLendModal(book);
                          }}
                        >
                          👤+
                        </motion.button>
                          {isOwnerView && (
                            <motion.button 
                              whileHover={iconHover} 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                requestProtectedAction({ type: 'DELETE_BOOK', id: book.id }); 
                              }} 
                              className="icon-btn delete-text"
                            >
                              🗑
                            </motion.button>
                          )}
                        </div>
                      </div>
                      <p className="book-author">By {info.authors?.join(', ') || 'Unknown'}</p>
                      {info.categories && <span className="book-badge">{info.categories[0]}</span>}
                      {book.localMeta?.series && <span className="book-badge" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', marginLeft: '5px' }}>{book.localMeta.series}</span>}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <AnimatePresence>
        {activeModal && (
          <motion.div className="modal-overlay" variants={modalOverlayVariants} initial="hidden" animate="show" exit="exit" onClick={closeModal}>
            <motion.div className="modal-content" variants={modalContentVariants} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{activeModal}</h2>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn-close" onClick={closeModal}>×</motion.button>
              </div>
              <div className="modal-body">
                {renderModalContent()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;