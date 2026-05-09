import logo from './logo.svg';
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './App.css';

// Importing our default book data (Google Books API format)
import defaultBooks from './google_books_export.json';

// Importing our animation recipes
import { 
  containerVariants, 
  itemVariants, 
  hoverLift, 
  tapShrink, 
  iconHover 
} from './animations';

function App() {
  // --- STATE MANAGEMENT ---
  const [books, setBooks] = useState(defaultBooks); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const fileInputRef = useRef(null);

  // --- LOGIC FUNCTIONS ---

  // Opens the file picker when the "Import" button is clicked
  const triggerFileSelect = () => fileInputRef.current.click();

  // Processes the uploaded JSON file
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        // We ensure we are saving an array, even if the JSON is a single object
        const newBooks = Array.isArray(importedData) ? importedData : [importedData];
        setBooks(newBooks);
      } catch (err) {
        alert("Failed to parse JSON. Ensure it matches the Google Books format.");
      }
    };
    reader.readAsText(file);
    event.target.value = null; // Reset input so you can re-upload the same file
  };

  // Removes a book by its unique ID
  const deleteBook = (id) => {
    setBooks(prev => prev.filter(book => book.id !== id));
  };

  // Filters the books based on the Search Bar input
  const filteredBooks = books.filter((book) => {
    const info = book.volumeInfo;
    const search = searchQuery.toLowerCase();
    return (
      info.title?.toLowerCase().includes(search) || 
      info.authors?.join(' ').toLowerCase().includes(search)
    );
  });

  return (
    <div className="App">
      {/* Hidden input field for JSON uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        accept=".json" 
        style={{ display: 'none' }} 
      />

      {/* HEADER: Title and Data Management */}
      <header className="app-header">
        <div className="header-title-group">
          <div className="logo-placeholder">|||\</div>
          <div>
            <h1>Library Catalogue</h1>
            <p>Manage your book collection & lending</p>
          </div>
        </div>
        <div className="header-actions">
          <motion.button whileTap={tapShrink} className="btn btn-export">↓ Export Data</motion.button>
          <motion.button 
            whileTap={tapShrink} 
            className="btn btn-import" 
            onClick={triggerFileSelect}
          >
            ↑ Import Data
          </motion.button>
          <motion.button 
            whileTap={tapShrink} 
            className="btn btn-clear"
            onClick={() => setBooks([])}
          >
            🗑 Clear All
          </motion.button>
        </div>
      </header>

      <main className="app-main">
        {/* ACTION BAR: Large entrance buttons */}
        <div className="action-bar">
          {['Scan Barcode', 'Vision AI', 'ISBN Lookup', 'Manual Entry'].map((text, i) => (
            <motion.button 
              key={text}
              whileHover={hoverLift} 
              whileTap={tapShrink} 
              className={`btn-large btn-style-${i}`}
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
          <button className="stats-link-btn">Show Statistics</button>
        </div>

        {/* THE BOOK LIST: AnimatePresence handles the exit animations */}
        <motion.div 
          className="book-list"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode='popLayout'>
            {filteredBooks.map((book) => {
              const info = book.volumeInfo; // Shortcut to Google's data structure
              
              return (
                <motion.div 
                  key={book.id} 
                  className="book-card"
                  variants={itemVariants}
                  layout // Makes other cards slide smoothly when one is deleted
                  exit="exit"
                >
                  <div className="book-cover-container">
                    {info.imageLinks?.thumbnail ? (
                      <img src={info.imageLinks.thumbnail} alt={info.title} className="book-cover-img" />
                    ) : (
                      <div className="book-cover-placeholder"><span>📖</span></div>
                    )}
                  </div>
                  
                  <div className="book-details">
                    <div className="book-title-row">
                      <h3>{info.title}</h3>
                      <div className="book-card-actions">
                        <motion.button whileHover={iconHover} className="icon-btn">👤+</motion.button>
                        <motion.button 
                          whileHover={iconHover} 
                          onClick={() => deleteBook(book.id)}
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
    </div>
  );
}

export default App;