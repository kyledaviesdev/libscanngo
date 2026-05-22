import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './App.css';

// Importing our default book data (Google Books API format)
import defaultBooks from './google_books_export.json';

// Importing our animation recipes (make sure to include the new ones)
import { 
  containerVariants, 
  itemVariants, 
  hoverLift, 
  tapShrink, 
  iconHover,
  modalOverlayVariants,
  modalContentVariants
} from './animations';

function App() {
  // --- STATE MANAGEMENT ---
  const [books, setBooks] = useState(defaultBooks); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [activeModal, setActiveModal] = useState(null); // Tracks which popup is open
  const [isbnInput, setIsbnInput] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const fileInputRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- LOGIC FUNCTIONS ---
  const triggerFileSelect = () => fileInputRef.current.click();

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      const newBooks = Array.isArray(importedData) ? importedData : [importedData];
      setBooks(newBooks);
    } catch (err) {
      alert("Failed to parse JSON. Ensure it matches the Google Books format.");
    }
  };
  reader.readAsText(file);
  event.target.value = null; 
};

// Fetch a book from the Google Books API using its ISBN
const fetchBookByISBN = async (isbn) => {
  if (!isbn.trim()) {
    alert("Please enter an ISBN first.");
    return;
  }
  
  try {
    const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
    const data = await response.json();

    if (data.totalItems > 0) {
      const newBook = data.items[0]; 
      setBooks(prevBooks => [newBook, ...prevBooks]);
      closeModal(); 
    } else {
      alert("Book not found in Google Books database.");
    }
  } catch (error) {
    console.error("Error fetching from Google Books:", error);
    alert("Failed to connect to the API.");
  }
};

  const deleteBook = (id) => {
    setBooks(prev => prev.filter(book => book.id !== id));
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
};

  // --- DYNAMIC MODAL CONTENT RENDERING ---
  const renderModalContent = () => {
    switch (activeModal) {
      case 'Scan Barcode':
        return (
          <>
            <div className="camera-placeholder">
              <div className="scan-line"></div>
              <span style={{ fontSize: '40px' }}>📷</span>
              <p style={{ marginTop: '10px' }}>Position barcode within frame</p>
            </div>
            <p style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
              Waiting for hardware scanner or camera input...
            </p>
          </>
        );
      case 'Vision AI':
        return (
          <>
            <div className="camera-placeholder">
              <div className="scan-line vision-scan-line"></div>
              <span style={{ fontSize: '40px' }}>🤖</span>
              <p style={{ marginTop: '10px' }}>Analyzing book cover...</p>
            </div>
            <p style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
              Powered by Vision AI cover recognition
            </p>
          </>
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
        
        return (
          <div className="book-detailed-view" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Top Section: Cover & Key Metadata */}
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
            
            {/* Middle Section: Scrollable Summary/Description */}
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
            
            {/* Bottom Section: System Identifiers (ISBNs) */}
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
    // Updated className to include 'dark-mode' conditionally
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        accept=".json" 
        style={{ display: 'none' }} 
      />

      {/* HEADER */}
      <header className="app-header">
        <div className="header-title-group">
          <div className="logo-placeholder">|||\</div>
          <div>
            <h1>Library Catalogue</h1>
            <p>Manage your book collection & lending</p>
          </div>
        </div>
        <div className="header-actions">
          {/* NEW: Dark Mode Toggle Button */}
          <motion.button 
            whileTap={tapShrink} 
            className="btn btn-theme"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </motion.button>

          <motion.button whileTap={tapShrink} className="btn btn-export">↓ Export</motion.button>
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
        {/* ACTION BAR */}
        <div className="action-bar">
          {['Scan Barcode', 'Vision AI', 'ISBN Lookup', 'Manual Entry'].map((text, i) => (
            <motion.button 
              key={text}
              whileHover={hoverLift} 
              whileTap={tapShrink} 
              className={`btn-large btn-style-${i}`}
              onClick={() => setActiveModal(text)} // Opens the modal
            >
              {text}
            </motion.button>
          ))}
        </div>

        {/* SEARCH SECTION */}
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

        {/* LIST INFO */}
        <div className="list-header">
          <h2>{filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} found</h2>
          <button className="stats-link-btn" style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer'}}>Show Statistics</button>
        </div>

        {/* THE BOOK LIST */}
        <motion.div 
          className="book-list"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode='popLayout'>
            {filteredBooks.map((book) => {
              const info = book.volumeInfo;
              
              return (
                <motion.div 
                  key={book.id} 
                  className="book-card"
                  variants={itemVariants}
                  layout 
                  exit="exit"
                  whileHover={{ scale: 1.02, cursor: 'pointer' }} // Enhances UX visually
                  onClick={() => {
                    setActiveModal('Book Details'); // Tells the modal to open
                    setSelectedBook(book);          // Sends the book data to state
                  }}
                >
                  <div className="book-cover-container">
                    {info.imageLinks?.thumbnail ? (
                      <img src={info.imageLinks.thumbnail} alt={info.title} className="book-cover-img" style={{width: '80px', height: '100px', objectFit: 'cover', borderRadius: '6px', marginRight: '20px'}} />
                    ) : (
                      <div className="book-cover-placeholder"><span>📖</span></div>
                    )}
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
                            e.stopPropagation(); // ← Prevents modal from popping open
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

      {/* GLOBAL MODAL RENDERER */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            className="modal-overlay"
            variants={modalOverlayVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={closeModal} // Clicking background closes modal
          >
            {/* stopPropagation prevents clicks inside the modal box from closing it */}
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
              
              {/* Inject the correct layout depending on state */}
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