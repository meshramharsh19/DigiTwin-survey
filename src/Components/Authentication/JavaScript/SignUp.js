import { useState } from 'react';
import { Map, Lock, User, Eye, EyeOff, Mail, Building, Phone, MapPin, Compass, Globe } from 'lucide-react';
import '../Styles/SignUp.css';

export default function GISSurveyorSignup({ onSignup, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    organization: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = () => {
    // Basic validation
    if (!formData.fullName || !formData.email || !formData.password) {
      alert('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!agreeToTerms) {
      alert('Please agree to Terms & Conditions');
      return;
    }
    console.log('Signup attempted with:', formData);

    // Future mein yaha API call hoga
    if (onSignup) {
      onSignup(formData);
    }
  };

  return (
    <div className="signup-container">
      {/* Left Side - Signup Form */}
      <div className="signup-side">
        <div className="signup-form-container">
          {/* Logo and Title */}
          <div className="logo-title">
            <div className="logo-header">
              <div className="logo">
                <Map className="logo-icon" strokeWidth={1.5} />
              </div>
              <div className="logo-text">
                <h1 className="logo-name">GIS Surveyor</h1>
              </div>
            </div>
            <h2 className="signup-title">Create Account</h2>
            <p className="signup-subtitle">Join our professional surveying platform</p>
          </div>

          {/* Signup Form */}
          <div className="signup-form">
            {/* Full Name Field */}
            <div className="form-group">
              <label htmlFor="fullName" className="label">
                Full Name *
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <User className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="input"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="label">
                Email Address *
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Mail className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="your.email@company.com"
                  required
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="form-group">
              <label htmlFor="phone" className="label">
                Phone Number
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Phone className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Organization Field */}
            <div className="form-group">
              <label htmlFor="organization" className="label">
                Organization
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Building className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  value={formData.organization}
                  onChange={handleChange}
                  className="input"
                  placeholder="Your Company Name"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="label">
                Password *
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? (
                    <EyeOff className="icon" strokeWidth={1.5} />
                  ) : (
                    <Eye className="icon" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="label">
                Confirm Password *
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  placeholder="Re-enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="icon" strokeWidth={1.5} />
                  ) : (
                    <Eye className="icon" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="terms">
              <input
                id="terms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="checkbox"
              />
              <label htmlFor="terms" className="checkbox-label">
                I agree to the{' '}
                <a href="#" className="terms-link">
                  Terms & Conditions
                </a>{' '}
                and{' '}
                <a href="#" className="terms-link">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="submit-button"
            >
              Create Account
            </button>

            {/* Login Link */}
            <div className="login-link">
              <span className="login-text">Already have an account? </span>
              <button
                onClick={onSwitchToLogin}
                className="login-button"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>© 2025 GIS Surveyor. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hero-side">
        <div className="hero-content">
          <div className="hero-header">
            <div className="hero-logo">
              <Globe className="hero-logo-icon" strokeWidth={1.5} />
            </div>
            <h2 className="hero-title">Start Your Journey</h2>
            <p className="hero-subtitle">Join thousands of professionals using advanced surveying tools</p>
          </div>

          {/* Features */}
          <div className="features">
            <div className="feature">
              <div className="feature-icon">
                <div className="feature-icon-wrapper">
                  <MapPin className="feature-icon-svg" strokeWidth={1.5} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">High Precision GPS</h3>
                <p className="feature-description">Sub-meter accuracy for professional surveys</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <div className="feature-icon-wrapper">
                  <Compass className="feature-icon-svg" strokeWidth={1.5} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Offline Mode</h3>
                <p className="feature-description">Work anywhere without internet connection</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <div className="feature-icon-wrapper">
                  <Map className="feature-icon-svg" strokeWidth={1.5} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Team Collaboration</h3>
                <p className="feature-description">Share projects and work together seamlessly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
