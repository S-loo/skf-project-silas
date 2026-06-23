import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('developer');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setRole('developer');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!email || !password || !firstName || !lastName) {
        setError('All fields are required.');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNonLetter = /[^a-zA-Z]/.test(password);
      if (!hasLetter || !hasNonLetter) {
        setError('Password must contain a mixture of letters and numbers/special characters.');
        return;
      }

      setLoading(true);
      try {
        await register(email, password, firstName, lastName, role);

        // ✅ OPTION A FIX: always go back to login
        resetForm();
        setIsRegister(false);
        navigate('/login', { replace: true });

      } catch (err) {
        setError(err.response?.data?.error || 'Registration failed.');
      } finally {
        setLoading(false);
      }

    } else {
      if (!email || !password) {
        setError('Email and password are required.');
        return;
      }

      setLoading(true);
      try {
        await login(email, password);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            background: '#16191F',
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Zap size={24} color="#FF9900" />
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#16191F' }}>
            silvora Dashboard
          </h1>

          <p style={{ fontSize: 13, color: '#5F6B7A' }}>
            {isRegister ? 'Create a new account' : 'Sign in to your workspace'}
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 24 }}>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {error && (
              <div style={{
                background: '#FDECEA',
                border: '1px solid #F5C6C0',
                borderRadius: 4,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#D13212',
                fontSize: 13,
              }}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {isRegister && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    placeholder="First Name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="form-input"
                  />
                  <input
                    placeholder="Last Name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="form-input"
                  />
                </div>

                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="form-input"
                >
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Administrator</option>
                </select>
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="form-input"
            />

            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingRight: 40 }}
              />

              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>

          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                resetForm();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#FF9900',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isRegister ? 'Already have account? Sign In' : 'Create account'}
            </button>
          </div>

        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#5F6B7A' }}>
          silvora labs
        </p>

      </div>
    </div>
  );
}