import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Tesseract from 'tesseract.js';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import './App.css';

// Importing our default book data (Google Books API format)
import defaultBooks from './google_books_export.json';

// Importing our animation recipes
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
      // Ignore keypresses if the user is typing inside an actual input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
      }

      const currentTime = Date.now();
      
      // Clear buffer if the delay between characters is too long.
      // Scanners emit keys < 30ms apart. Humans type slower.
      if (currentTime - lastKeyTime.current > 50) {
        scanBuffer.current = '';
      }
      
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        const finalString = scanBuffer.current.trim();
        
        // Check if it's a valid ISBN length
        if (finalString.length === 10 || finalString.length === 13) {
          onScanSuccess(finalString);
        }
        scanBuffer.current = ''; 
        return;
      }

      // Buffer number inputs
      if (e.key.length === 1 && /\d/.test(e.key)) {
        scanBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScanSuccess]);

  return null; // Runs invisibly in the background
};

const BarcodeScannerPlugin = ({ onScanSuccess }) => {
  const scannerRef = useRef(null);
  useEffect(() => {
    // Clear out any duplicate HTML injected by React Strict Mode
    const scannerElement = document.getElementById("reader");
    if (scannerElement) {
      scannerElement.innerHTML = "";
    }

    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader", 
        { 
          fps: 15, 
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13 // ONLY look for standard 13-digit book ISBNs
          ]
        }, 
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.clear().then(() => {
              onScanSuccess(decodedText);
            }).catch(e => console.error("Error clearing scanner", e));
          }
        },
        (errorMessage) => {
          // Safe to ignore background noise
        }
      );
    }

    // Cleanup: Shut down the camera when the modal closes
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner: ", error);
        });
        scannerRef.current = null; // Reset the ref
      }
    };
  }, []); // <-- Empty array ensures this only runs once

  return <div id="reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}></div>;
};

const VisionAIPlugin = ({ onProcessImage }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // 1. Request native camera access
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } // Prefers rear camera on mobile
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied or unavailable:", err);
      }
    };

    startCamera();

    // 2. Strict cleanup to prevent ghost cameras
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
      
      // Match canvas size to video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame onto the canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 image string
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Update UI state
      setCapturedImage(imageData);
      setIsAnalyzing(true);
      
      // Turn off the live camera feed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Send the image up to the parent component for API processing
      onProcessImage(imageData);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div className="camera-placeholder" style={{ padding: 0, backgroundColor: '#000' }}>
        
        {/* State 1: Live Video Feed */}
        {!capturedImage && (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {/* State 2: Captured Image with Scan Line Animation */}
        {capturedImage && isAnalyzing && (
          <>
            <img 
              src={capturedImage} 
              alt="Captured cover" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} 
            />
            <div className="scan-line vision-scan-line"></div>
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '30px', display: 'block', textAlign: 'center' }}>🤖</span>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>Extracting Text...</p>
            </div>
          </>
        )}

        {/* Hidden Canvas used for capturing the frame */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {!isAnalyzing && (
        <button 
          className="btn btn-submit" 
          style={{ backgroundColor: '#a855f7' }} // Vision AI Purple
          onClick={takePicture}
        >
          📷 Capture Cover
        </button>
      )}
    </div>
  );
};

function App() {
  // --- STATE MANAGEMENT ---
  const [catalogueName, setCatalogueName] = useState('Library Catalogue');
  const [books, setBooks] = useState(defaultBooks); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [activeModal, setActiveModal] = useState(null); 
  const [isbnInput, setIsbnInput] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [modalError, setModalError] = useState('');
  const [ocrProgress, setOcrProgress] = useState(null);
  const fileInputRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [visionQuery, setVisionQuery] = useState('');      
  const [visionResults, setVisionResults] = useState([]);  
  const [isSearchingVision, setIsSearchingVision] = useState(false);

  // --- LOGIC FUNCTIONS ---
  const triggerFileSelect = () => fileInputRef.current.click();

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Verify if data contains our custom catalogue wrapper package
        if (importedData && typeof importedData === 'object' && !Array.isArray(importedData) && 'books' in importedData) {
          if (importedData.catalogueName) {
            setCatalogueName(importedData.catalogueName);
          }
          const newBooks = Array.isArray(importedData.books) ? importedData.books : [importedData.books];
          setBooks(newBooks);
        } else {
          // Fallback parsing for raw Google Book lists or isolated book metadata
          const newBooks = Array.isArray(importedData) ? importedData : [importedData];
          setBooks(newBooks);
        }
      } catch (err) {
        alert("Failed to parse JSON. Ensure it matches the correct app catalogue format.");
      }
    };
    reader.readAsText(file);
    event.target.value = null; 
  };

  const handleExport = () => {
    // Structure containing catalogue metadata along with book collection values
    const exportData = {
      catalogueName: catalogueName.trim() || 'Library Catalogue',
      books: books
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;

    // Build timestamp values matching YYYY-MM-DD_HH-MM-SS formats
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    // Purge bad file characters from the custom title
    const safeTitle = catalogueName.trim().replace(/[^a-zA-Z0-9-_]/g, '_') || 'Library_Catalogue';
    const fileName = `${safeTitle}_${dateStr}_${timeStr}.json`;

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Fetch a book from the Google Books API using its ISBN
  const fetchBookByISBN = async (isbn) => {
    setModalError(''); // Clear previous errors when trying again
    if (!isbn.trim()) {
      setModalError("Please enter an ISBN first.");
      return;
    }
    
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
      const data = await response.json();

      if (data.totalItems > 0) {
        const fetchedBook = data.items[0]; 
        
        setBooks(prevBooks => {
          // Check if the book is already in the local library
          const existingIndex = prevBooks.findIndex(b => b.id === fetchedBook.id);
          
          if (existingIndex >= 0) {
            // Book exists: Create a copy and increment our local metadata
            const updatedBooks = [...prevBooks];
            const existingBook = updatedBooks[existingIndex];
            
            // Fallback just in case older data doesn't have localMeta yet
            const currentMeta = existingBook.localMeta || { quantity: 0, available: 0 };
            
            updatedBooks[existingIndex] = {
              ...existingBook,
              localMeta: {
                ...currentMeta,
                quantity: currentMeta.quantity + 1,
                available: currentMeta.available + 1
              }
            };
            return updatedBooks;
          } else {
            // New book: Add it and attach our custom inventory tracking
            const newBookWithMeta = {
              ...fetchedBook,
              localMeta: {
                quantity: 1,
                available: 1
              }
            };
            return [newBookWithMeta, ...prevBooks];
          }
        });
        
        closeModal(); 
      } else {
        setModalError(`No book found for barcode: ${isbn}`);
      }
    } catch (error) {
      console.error("Error fetching from Google Books:", error);
      setModalError("Failed to connect to the Google Books API.");
    }
  };

  const handleGlobalScan = (scannedIsbn) => {
    setActiveModal('Scan Barcode'); // Pop open the modal to show the user what's happening
    setIsbnInput(scannedIsbn);
    fetchBookByISBN(scannedIsbn);
  };

  const fetchBooksByText = async (query) => {
    setModalError('');
    setIsSearchingVision(true);
    setVisionResults([]); // Clear previous results

    try {
      const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}`);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        setVisionResults(data.items);
      } else {
        setModalError(`No books found matching: "${query}"`);
      }
    } catch (error) {
      console.error("Error fetching from Google Books:", error);
      setModalError("Failed to connect to the Google Books API.");
    } finally {
      setIsSearchingVision(false);
    }
  };

  const deleteBook = (id) => {
    setBooks(prevBooks => {
      const existingIndex = prevBooks.findIndex(b => b.id === id);
      
      // If book isn't found, do nothing
      if (existingIndex === -1) return prevBooks;

      const existingBook = prevBooks[existingIndex];
      const currentQuantity = existingBook.localMeta?.quantity || 1;
      const currentAvailable = existingBook.localMeta?.available ?? 1;

      if (currentQuantity > 1) {
        const updatedBooks = [...prevBooks];
        updatedBooks[existingIndex] = {
          ...existingBook,
          localMeta: {
            ...existingBook.localMeta,
            quantity: currentQuantity - 1,
            available: Math.max(0, currentAvailable - 1)
          }
        };
        return updatedBooks;
      } else {
        // Only 1 copy left, so remove the book entirely from the library
        return prevBooks.filter(book => book.id !== id);
      }
    });
  };

  const filteredBooks = books.filter((book) => {
    const info = book.volumeInfo;
    const search = searchQuery.toLowerCase();
    return (
      info.title?.toLowerCase().includes(search) || 
      info.authors?.join(' ').toLowerCase().includes(search)
    );
  });

  const closeModal = () => {
    setActiveModal(null);
    setIsbnInput('');
    setSelectedBook(null);
    setModalError('');
    setVisionQuery('');
    setVisionResults([]);
    setOcrProgress(null);
  };

  // --- DYNAMIC MODAL CONTENT RENDERING ---
  const renderModalContent = () => {
    switch (activeModal) {
      case 'Scan Barcode':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📟</div>
            <h3 style={{ margin: 0 }}>Scanner Ready</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              You don't need to click anything! Just pull the trigger on your hardware scanner to instantly process an ISBN.
            </p>
            
            <AnimatePresence>
              {modalError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '14px', textAlign: 'center', border: '1px solid #f87171', marginTop: '10px' }}
                >
                  <strong>Scan Failed:</strong> {modalError}
                </motion.div>
              )}
            </AnimatePresence>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '15px 0' }} />
            
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Manual Fallback</label>
              <input 
                type="text" 
                placeholder="Or type ISBN and press Enter..." 
                value={isbnInput}
                onChange={(e) => setIsbnInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchBookByISBN(isbnInput);
                }}
                autoFocus
              />
            </div>
            
            {isbnInput && !modalError && (
              <p style={{ fontSize: '14px', color: '#2563eb', fontWeight: 'bold' }}>Fetching data for: {isbnInput}...</p>
            )}
          </div>
        );
      case 'Vision AI':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {!visionQuery && visionResults.length === 0 && (
              <>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                  Position the book cover clearly in the frame.
                </p>
                <VisionAIPlugin 
                  onProcessImage={async (base64Image) => {
                    setModalError('');
                    setOcrProgress('Initializing AI Engine...');
                    try {
                      const result = await Tesseract.recognize(
                        base64Image, 'eng',
                        { logger: m => {
                            if (m.status === 'recognizing text') setOcrProgress(`Reading text: ${Math.round(m.progress * 100)}%`);
                            else setOcrProgress("Loading language models...");
                          }
                        }
                      );
                      
                      const extractedText = result.data.text.replace(/\n/g, ' ').trim();
                      if (extractedText.length > 3) {
                        setVisionQuery(extractedText.substring(0, 100)); 
                      } else {
                        setModalError("No readable text found. Try again.");
                      }
                    } catch (error) {
                      setModalError("Vision AI processing failed.");
                    } finally {
                      setOcrProgress(null);
                    }
                  }} 
                />
              </>
            )}

            {visionQuery && visionResults.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="form-group">
                  <label>Verify Extracted Text</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 5px 0' }}>
                    Edit any typos before searching.
                  </p>
                  <input 
                    type="text" 
                    value={visionQuery} 
                    onChange={(e) => setVisionQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button 
                    whileTap={tapShrink} 
                    className="btn btn-theme" 
                    style={{ flex: 1 }}
                    onClick={() => setVisionQuery('')} 
                  >
                    Retake
                  </motion.button>
                  <motion.button 
                    whileTap={tapShrink} 
                    className="btn btn-submit" 
                    style={{ flex: 2, margin: 0, backgroundColor: '#a855f7' }}
                    onClick={() => fetchBooksByText(visionQuery)}
                  >
                    {isSearchingVision ? 'Searching...' : 'Search Google Books'}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {visionResults.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Select Correct Edition:</label>
                  <button 
                    onClick={() => setVisionResults([])} 
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                  >
                    ← Back to Edit
                  </button>
                </div>
                
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
                  {visionResults.map(book => {
                    const info = book.volumeInfo;
                    return (
                      <div key={book.id} style={{ display: 'flex', gap: '10px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', alignItems: 'center' }}>
                        {info.imageLinks?.thumbnail ? (
                          <img src={info.imageLinks.thumbnail} alt="cover" style={{ width: '40px', height: '60px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '60px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📖</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.title}</h4>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{info.authors?.join(', ') || 'Unknown'}</p>
                        </div>
                        <motion.button 
                          whileTap={tapShrink}
                          style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', border: 'none', cursor: 'pointer' }}
                          onClick={() => {
                            setBooks(prev => [book, ...prev]); 
                            closeModal(); 
                          }}
                        >
                          Add
                        </motion.button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {ocrProgress && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', color: '#a855f7', fontWeight: 'bold', fontSize: '14px' }}>
                   {ocrProgress}
                 </motion.div>
              )}
              {modalError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '14px', textAlign: 'center', border: '1px solid #f87171' }}>
                  {modalError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'ISBN Lookup':
        return (
          <>
            <div className="form-group">
              <label>Enter ISBN</label>
              <input 
                type="text" 
                placeholder="e.g. 9780743273565" 
                autoFocus 
                value={isbnInput}
                onChange={(e) => setIsbnInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchBookByISBN(isbnInput);
                }}
              />
            </div>
            <motion.button 
              whileTap={tapShrink} 
              className="btn btn-submit"
              onClick={() => fetchBookByISBN(isbnInput)}
            >
              Fetch from Google Books
            </motion.button>
          </>
        );
      case 'Manual Entry':
        return (
          <>
            <div className="form-group">
              <label>Book Title</label>
              <input type="text" placeholder="Enter title" />
            </div>
            <div className="form-group">
              <label>Author(s)</label>
              <input type="text" placeholder="Enter author names" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input type="text" placeholder="e.g. Fiction, Science" />
            </div>
            <motion.button whileTap={tapShrink} className="btn btn-submit">
              Save to Library
            </motion.button>
          </>
        );
      case 'Book Details':
        if (!selectedBook) return null;
        const volumeInfo = selectedBook.volumeInfo;
        
        // Extract local inventory tracking values (fall back to 1 if empty)
        const quantity = selectedBook.localMeta?.quantity || 1;
        const available = selectedBook.localMeta?.available ?? 1;
        
        return (
          <div className="book-detailed-view" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              {volumeInfo.imageLinks?.thumbnail ? (
                <img 
                  src={volumeInfo.imageLinks.thumbnail} 
                  alt={volumeInfo.title} 
                  style={{ width: '100px', height: '140px', objectFit: 'cover', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} 
                />
              ) : (
                <div className="book-cover-placeholder" style={{ width: '100px', height: '140px' }}><span>📖</span></div>
              )}
              
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', lineHeight: '1.2' }}>{volumeInfo.title}</h3>
                <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '15px' }}>
                  By {volumeInfo.authors?.join(', ') || 'Unknown Author'}
                </p>
                
                {/* STYLIZED INVENTORY STATUS FOR MODAL */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    color: available > 0 ? '#16a34a' : '#dc2626', 
                    backgroundColor: available > 0 ? '#dcfce7' : '#fee2e2', 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    border: available > 0 ? '1px solid #bbf7d0' : '1px solid #fecaca'
                  }}>
                    🟢 {available} Available
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    color: '#4b5563', 
                    backgroundColor: '#f3f4f6', 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    border: '1px solid #e5e7eb' 
                  }}>
                    📦 {quantity} Total Copies
                  </span>
                </div>
                
                {volumeInfo.categories && (
                  <span className="book-badge" style={{ display: 'inline-block', marginBottom: '10px' }}>
                    {volumeInfo.categories.join(', ')}
                  </span>
                )}
                
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0 }}><strong>Publisher:</strong> {volumeInfo.publisher || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Published:</strong> {volumeInfo.publishedDate || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Pages:</strong> {volumeInfo.pageCount || 'N/A'} pages</p>
                  {volumeInfo.averageRating && (
                    <p style={{ margin: 0 }}><strong>Rating:</strong> ⭐ {volumeInfo.averageRating} / 5</p>
                  )}
                </div>
              </div>
            </div>
            
            {volumeInfo.description && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Description</h4>
                  <p style={{ 
                    fontSize: '14px', 
                    lineHeight: '1.5', 
                    color: 'var(--text-main)', 
                    maxHeight: '160px', 
                    overflowY: 'auto', 
                    paddingRight: '6px' 
                  }}>
                    {volumeInfo.description}
                  </p>
                </div>
              </>
            )}
            
            {volumeInfo.industryIdentifiers && (
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                fontSize: '12px', 
                color: 'var(--text-muted)', 
                marginTop: '5px',
                borderTop: '1px dashed var(--border-color)',
                paddingTop: '10px'
              }}>
                {volumeInfo.industryIdentifiers.map((id) => (
                  <span key={id.identifier}><strong>{id.type}:</strong> {id.identifier}</span>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
      
      {/* GLOBAL SCANNER INSTANCE */}
      <HardwareScannerListener onScanSuccess={handleGlobalScan} />

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        accept=".json" 
        style={{ display: 'none' }} 
      />

      <header className="app-header">
        <div className="header-title-group">
          <div className="logo-placeholder">|||\</div>
          <div>
            {/* INLINE EDITABLE TITLING FOR CATALOGUE NAME */}
            <input 
              type="text"
              value={catalogueName}
              onChange={(e) => setCatalogueName(e.target.value)}
              placeholder="Enter Catalogue Name..."
              title="Click to edit catalogue name"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '24px',
                fontWeight: '600',
                padding: 0,
                margin: 0,
                outline: 'none',
                width: '100%',
                fontFamily: 'inherit'
              }}
            />
            <p>Manage your book collection & lending</p>
          </div>
        </div>
        <div className="header-actions">
          <motion.button 
            whileTap={tapShrink} 
            className="btn btn-theme"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </motion.button>

          <motion.button 
            whileTap={tapShrink} 
            className="btn btn-export"
            onClick={handleExport}
          >
            ↓ Export
          </motion.button>
          
          <motion.button 
            whileTap={tapShrink} 
            className="btn btn-import" 
            onClick={triggerFileSelect}
          >
            ↑ Import
          </motion.button>
        </div>
      </header>

      <main className="app-main">
        <div className="action-bar">
          {['Scan Barcode', 'Vision AI', 'ISBN Lookup', 'Manual Entry'].map((text, i) => (
            <motion.button 
              key={text}
              whileHover={hoverLift} 
              whileTap={tapShrink} 
              className={`btn-large btn-style-${i}`}
              onClick={() => setActiveModal(text)} 
            >
              {text}
            </motion.button>
          ))}
        </div>

        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search by title or author..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="list-header">
          <h2>{filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} found</h2>
          <button className="stats-link-btn" style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer'}}>Show Statistics</button>
        </div>

        <motion.div 
          className="book-list"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode='popLayout'>
            {filteredBooks.map((book) => {
              const info = book.volumeInfo;
              const availableCopies = book.localMeta?.available ?? 1;
              
              return (
                <motion.div 
                  key={book.id} 
                  className="book-card"
                  variants={itemVariants}
                  layout 
                  exit="exit"
                  whileHover={{ scale: 1.02, cursor: 'pointer' }} 
                  onClick={() => {
                    setActiveModal('Book Details'); 
                    setSelectedBook(book);          
                  }}
                >
                  {/* COVER CONTAINER WITH INLINE HOVER ANCHORING */}
                  <div className="book-cover-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '6px', marginRight: '20px', flexShrink: 0 }}>
                    {info.imageLinks?.thumbnail ? (
                      <img src={info.imageLinks.thumbnail} alt={info.title} className="book-cover-img" style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                    ) : (
                      <div className="book-cover-placeholder" style={{ margin: 0 }}><span>📖</span></div>
                    )}
                    
                    {/* STYLIZED OVERLAY - SLIDES UP ON HOVER */}
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
                          whileHover={iconHover} 
                          className="icon-btn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          👤+
                        </motion.button>
                        <motion.button 
                          whileHover={iconHover} 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            deleteBook(book.id);
                          }}
                          className="icon-btn delete-text"
                        >
                          🗑
                        </motion.button>
                      </div>
                    </div>
                    <p className="book-author">By {info.authors?.join(', ') || 'Unknown'}</p>
                    {info.categories && <span className="book-badge">{info.categories[0]}</span>}
                    <p className="book-date">Published: {info.publishedDate || 'N/A'}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </main>

      <AnimatePresence>
        {activeModal && (
          <motion.div 
            className="modal-overlay"
            variants={modalOverlayVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={closeModal} 
          >
            <motion.div 
              className="modal-content"
              variants={modalContentVariants}
              onClick={(e) => e.stopPropagation()} 
            >
              <div className="modal-header">
                <h2>{activeModal}</h2>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="btn-close" 
                  onClick={closeModal}
                >
                  ×
                </motion.button>
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