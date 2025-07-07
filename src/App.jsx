// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// --- SET THESE TO YOUR SUPABASE PROJECT ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function SitePasswordGate({ onUnlock }) {
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const { data, error } = await supabase.rpc('check_site_password', { pwd: input });
    setLoading(false);
    if (error) {
      setErr('Error checking password');
    } else if (data === true) {
      localStorage.setItem('siteUnlocked', 'true');
      onUnlock();
    } else {
      setErr('Incorrect password');
    }
  };

  return (
    <div className="site-gate">
      <form className="form" onSubmit={handleSubmit}>
        <h2>Enter Site Password</h2>
        {err && <div className="error">{err}</div>}
        <input
          type="password"
          placeholder="Site password"
          value={input}
          onChange={e => setInput(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>{loading ? 'Checking...' : 'Enter'}</button>
      </form>
      <style>{`
        .site-gate {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7f7f9;
        }
        .form {
          background: #fff;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          max-width: 400px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          align-items: center;
        }
        .form input, .form button {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .form button {
          background: #222;
          color: #fff;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .form button:hover {
          background: #444;
        }
        .error {
          color: #e74c3c;
          font-size: 0.95rem;
          width: 100%;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

// --- Supabase Auth Hook with isAdmin from user_metadata ---
function useSupabaseAuth() {
  const [user, setUser] = useState(() => supabase.auth.getUser()?.data?.user ?? null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Check if user is admin via user_metadata
  const isAdmin = user?.user_metadata?.is_admin === true;

  return { user, login, logout, isAdmin };
}

function FolderGrid() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    supabase
      .from('movies')
      .select('folder')
      .then(({ data, error }) => {
        if (!error && data) {
          const uniqueFolders = [...new Set(data.map(m => m.folder))];
          setFolders(uniqueFolders);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <h2>Categories</h2>
      {loading ? (
        <div className="loader"><div className="loader-spinner"></div></div>
      ) : (
        <div className="folder-grid">
          {folders.map(folder => (
            <div
              className="folder-card"
              key={folder}
              onClick={() => navigate(`/folder/${encodeURIComponent(folder)}`)}
              tabIndex={0}
              role="button"
              style={{ cursor: 'pointer' }}
            >
              {folder == "Jameson's Films" ? (
                <span className="folder-icon" role="img" aria-label="Folder">🧃</span>
              ) : folder == "Cabin Films" ? (
                <span className="folder-icon" role="img" aria-label="Folder">🎥</span>
              ) : (
                <span className="folder-icon" role="img" aria-label="Folder">📁</span>
              )}
              <span className="folder-name">{folder}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MovieListByFolder() {
  const { folder } = useParams();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    supabase
      .from('movies')
      .select('*')
      .eq('folder', folder)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setMovies(data || []);
        setLoading(false);
      });
  }, [folder]);

  return (
    <div className="container">
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Categories</button>
      <h2>{folder}</h2>
      {loading ? (
        <div className="loader">
          <div className="loader-spinner"></div>
        </div>
      ) : (
        <div className="movie-grid">
          {movies.map(m => (
            <div className="movie-card" key={m.id}>
              {m.photo_url && (
                <img
                  src={m.photo_url}
                  alt={m.title}
                  className="movie-photo"
                  style={{ width: '100%', borderRadius: '8px', marginBottom: '0.7rem', objectFit: 'cover', maxHeight: '180px' }}
                />
              )}
              <div className="movie-header">
                <h3>{m.title}</h3>
                <span className="movie-date">{m.date}</span>
              </div>
              <div className="movie-meta">
                <span>{m.duration}</span>
                <span>{m.resolution}</span>
                <span>{m.file_size}</span>
              </div>
              <p className="movie-desc">{m.description}</p>
              <a className="download-btn" href={m.drive_link} target="_blank" rel="noopener noreferrer">
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await onLogin(email, password);
      navigate('/admin');
    } catch (e) {
      setErr('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={handleLogin}>
      <h2>Admin Login</h2>
      {err && <div className="error">{err}</div>}
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
    </form>
  );
}

function Admin({ user, logout }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState('');
  const [resolution, setResolution] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [folder, setFolder] = useState('');
  const [msg, setMsg] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMovies = () => {
    setLoading(true);
    supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMovies(data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const addMovie = async (e) => {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.from('movies').insert([{
      title,
      description,
      drive_link: driveLink,
      duration,
      date,
      resolution,
      file_size: fileSize,
      photo_url: photoUrl,
      folder
    }]);
    if (error) {
      setMsg('Error adding movie');
    } else {
      setMsg('Movie added!');
      setTitle('');
      setDescription('');
      setDriveLink('');
      setDuration('');
      setDate('');
      setResolution('');
      setFileSize('');
      setPhotoUrl('');
      setFolder('');
      fetchMovies();
    }
  };

  const deleteMovie = async (id) => {
    await supabase.from('movies').delete().eq('id', id);
    fetchMovies();
  };

  return (
    <div className="container">
      <h2>Admin Dashboard</h2>
      <form className="form" onSubmit={addMovie}>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <input placeholder="Google Drive Link" value={driveLink} onChange={e => setDriveLink(e.target.value)} required />
        <input placeholder="Duration (e.g. 1h 45m)" value={duration} onChange={e => setDuration(e.target.value)} />
        <input placeholder="Date (YYYY-MM-DD)" value={date} onChange={e => setDate(e.target.value)} />
        <input placeholder="Resolution (e.g. 1080p)" value={resolution} onChange={e => setResolution(e.target.value)} />
        <input placeholder="File Size (e.g. 1.2 GB)" value={fileSize} onChange={e => setFileSize(e.target.value)} />
        <input placeholder="Photo URL (optional)" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
        <input placeholder="Folder" value={folder} onChange={e => setFolder(e.target.value)} required />
        <button type="submit">Add Movie</button>
      </form>
      {msg && <div className="success">{msg}</div>}
      <h3>All Movies</h3>
      {loading ? (
        <div className="loader"><div className="loader-spinner"></div></div>
      ) : (
        <div className="movie-grid">
          {movies.map(m => (
            <div className="movie-card" key={m.id}>
              {m.photo_url && (
                <img
                  src={m.photo_url}
                  alt={m.title}
                  className="movie-photo"
                  style={{ width: '100%', borderRadius: '8px', marginBottom: '0.7rem', objectFit: 'cover', maxHeight: '180px' }}
                />
              )}
              <div className="movie-header">
                <h3>{m.title}</h3>
                <span className="movie-date">{m.date}</span>
              </div>
              <div className="movie-meta">
                <span>{m.duration}</span>
                <span>{m.resolution}</span>
                <span>{m.file_size}</span>
                <span>{m.folder}</span>
              </div>
              <p className="movie-desc">{m.description}</p>
              <a className="download-btn" href={m.drive_link} target="_blank" rel="noopener noreferrer">
                Download
              </a>
              <button className="delete-btn" onClick={() => deleteMovie(m.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const { user, login, logout, isAdmin } = useSupabaseAuth();
  const [siteUnlocked, setSiteUnlocked] = useState(() => localStorage.getItem('siteUnlocked') === 'true');

  return (
    <BrowserRouter>
      {!siteUnlocked ? (
        <SitePasswordGate onUnlock={() => setSiteUnlocked(true)} />
      ) : (
        <>
          <nav className="navbar">
            <div className="nav-left">
              <Link className="nav-title" to="/">James' Movie Database 🍿</Link>
            </div>
            <div className="nav-right">
              <Link to="/">Home</Link>
              {isAdmin ? (
                <>
                  <Link to="/admin">Admin</Link>
                  <button className="logout-btn" onClick={logout}>Logout</button>
                </>
              ) : (
                <Link to="/admin-login">Admin</Link>
              )}
            </div>
          </nav>
          <Routes>
            <Route path="/" element={<FolderGrid />} />
            <Route path="/folder/:folder" element={<MovieListByFolder />} />
            <Route path="/admin-login" element={<AdminLogin onLogin={login} />} />
            {isAdmin && <Route path="/admin" element={<Admin user={user} logout={logout} />} />}
          </Routes>
        </>
      )}
      <style>{`
        * {
          font-family: 'Inter', sans-serif;
        }
        body {
          font-family: 'Inter', sans-serif;
          background: #f7f7f9;
          margin: 0;
        }
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
          padding: 1rem 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .nav-title {
          font-weight: bold;
          font-size: 1.3rem;
          color: #222;
          text-decoration: none;
        }
        .nav-right a, .logout-btn {
          margin-left: 1rem;
          color: #555;
          text-decoration: none;
          background: none;
          border: none;
          font: inherit;
          cursor: pointer;
        }
        .container {
          max-width: 900px;
          margin: 2rem auto;
          padding: 0 1rem;
        }
        .folder-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
        }
        .folder-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          padding: 2rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: box-shadow 0.2s;
        }
        .folder-card:hover, .folder-card:focus {
          box-shadow: 0 4px 16px rgba(0,0,0,0.10);
        }
        .folder-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .folder-name {
          font-size: 1.1rem;
          color: #333;
          font-weight: 500;
        }
        .back-btn {
          background: none;
          border: none;
          color: #222;
          font-size: 1rem;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .movie-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        .movie-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          padding: 1.2rem 1rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          min-height: 200px;
        }
        .movie-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .movie-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }
        .movie-date {
          font-size: 0.9rem;
          color: #888;
        }
        .movie-meta {
          margin: 0.5rem 0;
          font-size: 0.95rem;
          color: #666;
          display: flex;
          gap: 1rem;
        }
        .movie-desc {
          flex: 1;
          color: #444;
          margin: 0.5rem 0 1rem 0;
        }
        .download-btn {
          background: #222;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          text-align: center;
          text-decoration: none;
          font-weight: 500;
          margin-bottom: 0.5rem;
          transition: background 0.2s;
        }
        .download-btn:hover {
          background: #444;
        }
        .delete-btn {
          background: #e74c3c;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.3rem 0.8rem;
          font-size: 0.9rem;
          cursor: pointer;
          align-self: flex-end;
        }
        .form {
          background: #fff;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          max-width: 400px;
          margin: 2rem auto;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .form input, .form button {
          padding: 0.7rem;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 1rem;
        }
        .form button {
          background: #222;
          color: #fff;
          border: none;
          font-weight: 500;
          cursor: pointer;
        }
        .form button:hover {
          background: #444;
        }
        .error {
          color: #e74c3c;
          font-size: 0.95rem;
        }
        .success {
          color: #27ae60;
          font-size: 0.95rem;
        }
        @media (max-width: 700px) {
          .movie-grid, .folder-grid {
            grid-template-columns: 1fr;
          }
        }
        .loader {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }
        .loader-spinner {
          border: 4px solid #eee;
          border-top: 4px solid #222;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </BrowserRouter>
  );
}

export default App;
