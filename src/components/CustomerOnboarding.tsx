import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  User, Mail, Phone, Calendar, ArrowRight, Search, 
  Sparkles, Crown, Award, ChefHat, Eye, EyeOff, 
  CheckCircle, Loader2, Star
} from 'lucide-react';
import { CustomerService } from '../services/customerService';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  settings: any;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  total_points: number;
  lifetime_points: number;
  current_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  tier_progress: number;
  visit_count: number;
  total_spent: number;
  last_visit?: string;
  created_at: string;
}

interface CustomerOnboardingProps {
  restaurant: Restaurant;
  onComplete: (customer: Customer) => void;
}

const CustomerOnboarding: React.FC<CustomerOnboardingProps> = ({ restaurant, onComplete }) => {
  const [step, setStep] = useState(0); // 0: welcome, 1: auth form
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome screen entrance animations
    if (step === 0 && welcomeRef.current) {
      const ctx = gsap.context(() => {
        // Logo entrance
        gsap.fromTo('.logo-entrance',
          { scale: 0, rotation: -180, opacity: 0 },
          { 
            scale: 1, 
            rotation: 0, 
            opacity: 1,
            duration: 1.2, 
            ease: "back.out(1.2)",
            delay: 0.2
          }
        );

        // Text reveals
        gsap.fromTo('.text-reveal',
          { y: 60, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 0.8, 
            stagger: 0.2, 
            ease: "power3.out",
            delay: 0.8
          }
        );

        // Graphic entrance
        gsap.fromTo('.graphic-entrance',
          { scale: 0.8, opacity: 0, y: 40 },
          { 
            scale: 1, 
            opacity: 1, 
            y: 0,
            duration: 1, 
            ease: "power3.out",
            delay: 1.2
          }
        );

        // Button entrance
        gsap.fromTo('.cta-entrance',
          { y: 40, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 0.8, 
            ease: "power3.out",
            delay: 1.6
          }
        );
      });

      return () => ctx.revert();
    }
  }, [step]);

  useEffect(() => {
    // Form entrance animation
    if (step === 1 && formRef.current && !isTransitioning) {
      const ctx = gsap.context(() => {
        gsap.fromTo('.form-element',
          { y: 30, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 0.6, 
            stagger: 0.1, 
            ease: "power3.out"
          }
        );
      });

      return () => ctx.revert();
    }
  }, [step, authMode, isTransitioning]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleEmailCheck = async (email: string) => {
    if (!email || email.length < 3) {
      setExistingCustomer(null);
      return;
    }

    try {
      const customer = await CustomerService.getCustomerByEmail(restaurant.id, email);
      if (customer) {
        setExistingCustomer(customer);
        if (authMode !== 'login') {
          setIsTransitioning(true);
          setTimeout(() => {
            setAuthMode('login');
            setIsTransitioning(false);
          }, 300);
        }
      } else {
        setExistingCustomer(null);
        if (authMode !== 'signup') {
          setIsTransitioning(true);
          setTimeout(() => {
            setAuthMode('signup');
            setIsTransitioning(false);
          }, 300);
        }
      }
    } catch (err) {
      setExistingCustomer(null);
    }
  };

  const handleLogin = async () => {
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const customer = await CustomerService.getCustomerByEmail(restaurant.id, formData.email);
      if (customer) {
        onComplete(customer);
      } else {
        setError('Customer not found');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const newCustomer = await CustomerService.createCustomer(restaurant.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        date_of_birth: formData.birthDate || undefined
      });

      onComplete(newCustomer);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] relative overflow-hidden">
      {/* Floating background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full float-element" />
        <div className="absolute bottom-40 left-10 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full float-element" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full float-element" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center shadow-lg">
              <span className="voya-brand text-white text-lg">V</span>
            </div>
            <div>
              <h1 className="voya-brand text-[var(--color-dark)] text-xl">VOYA</h1>
              <p className="text-xs text-gray-500 font-medium">{restaurant.name}</p>
            </div>
          </motion.div>
        </div>
      </motion.header>

      <div className="flex items-center justify-center min-h-screen p-6 pt-24" ref={containerRef}>
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div
                key="welcome"
                ref={welcomeRef}
                className="text-center space-y-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Logo */}
                <motion.div 
                  className="logo-entrance w-32 h-32 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-full flex items-center justify-center mx-auto shadow-2xl relative"
                >
                  <span className="voya-brand text-white text-4xl">V</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                </motion.div>
                
                {/* Welcome Text */}
                <div className="space-y-6">
                  <div className="text-reveal">
                    <h1 className="text-4xl font-bold text-[var(--color-dark)] leading-tight">
                      Welcome
                    </h1>
                  </div>
                  <div className="text-reveal">
                    <p className="text-lg text-gray-600 leading-relaxed font-medium max-w-sm mx-auto">
                      Manage your rewards with ease using our restaurant loyalty system.
                    </p>
                  </div>
                </div>

                {/* Minimal Graphic */}
                <motion.div className="graphic-entrance space-y-8">
                  <div className="flex justify-center items-center gap-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-2xl flex items-center justify-center">
                      <Star className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <div className="w-2 h-2 bg-[#1E2A78] rounded-full" />
                    <div className="w-16 h-16 bg-gradient-to-br from-[#1E2A78]/20 to-[#3B4B9A]/20 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-[#1E2A78]" />
                    </div>
                  </div>
                </motion.div>

                {/* CTA Button */}
                <motion.button
                  onClick={nextStep}
                  className="cta-entrance w-full bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white font-bold py-6 px-8 rounded-2xl hover:shadow-2xl transition-all duration-300 text-lg"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Get Started
                </motion.button>
              </motion.div>
            )}

            {/* Step 1: Auth Form */}
            {step === 1 && (
              <motion.div
                key="auth"
                ref={formRef}
                className="card-modern rounded-3xl overflow-hidden shadow-2xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                {error && (
                  <motion.div 
                    className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-4 text-sm font-medium"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {error}
                  </motion.div>
                )}

                <div className="p-8 space-y-8">
                  {/* Header */}
                  <motion.div 
                    className="form-element text-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--color-dark)] mb-2">
                      {authMode === 'login' ? 'Welcome Back!' : 'Join Our Program'}
                    </h2>
                    <p className="text-gray-600">
                      {authMode === 'login' ? 'Sign in to access your loyalty account' : 'Create your account and start earning rewards'}
                    </p>
                  </motion.div>

                  {/* Email Field */}
                  <motion.div className="form-element">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          handleInputChange('email', e.target.value);
                          handleEmailCheck(e.target.value);
                        }}
                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-lg transition-all duration-300 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </motion.div>

                  {/* Existing Customer Detection */}
                  <AnimatePresence>
                    {existingCustomer && !isTransitioning && (
                      <motion.div 
                        className="form-element bg-blue-50 border border-blue-200 rounded-2xl p-4"
                        initial={{ opacity: 0, height: 0, scale: 0.9 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center text-white font-bold">
                            {existingCustomer.first_name[0]}{existingCustomer.last_name[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-blue-900">Welcome back!</p>
                            <p className="text-sm text-blue-700">
                              {existingCustomer.first_name} {existingCustomer.last_name}
                            </p>
                            <p className="text-sm text-blue-600">
                              {existingCustomer.total_points} points • {existingCustomer.current_tier} tier
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Signup Fields */}
                  <AnimatePresence>
                    {authMode === 'signup' && !isTransitioning && (
                      <motion.div 
                        className="form-element space-y-6"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              First Name
                            </label>
                            <input
                              type="text"
                              value={formData.firstName}
                              onChange={(e) => handleInputChange('firstName', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white transition-all duration-300 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                              placeholder="John"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Last Name
                            </label>
                            <input
                              type="text"
                              value={formData.lastName}
                              onChange={(e) => handleInputChange('lastName', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white transition-all duration-300 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                              placeholder="Doe"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Phone Number (Optional)
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white transition-all duration-300 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                              placeholder="+971 50 123 4567"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Date of Birth (Optional)
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="date"
                              value={formData.birthDate}
                              onChange={(e) => handleInputChange('birthDate', e.target.value)}
                              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white transition-all duration-300 focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Button */}
                  <motion.button
                    onClick={authMode === 'login' ? handleLogin : handleSignup}
                    disabled={loading || !formData.email.trim() || (authMode === 'signup' && (!formData.firstName.trim() || !formData.lastName.trim()))}
                    className="form-element w-full bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white font-bold py-5 px-6 rounded-2xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {loading ? (
                      <div className="stellar-loader w-6 h-6" />
                    ) : (
                      <>
                        {authMode === 'login' ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CustomerOnboarding;