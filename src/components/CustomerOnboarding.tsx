import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  User, Mail, Phone, Calendar, ArrowRight, ArrowLeft, 
  CheckCircle, Search, UserPlus, Sparkles, Gift, Star,
  Trophy, Heart, Zap, ChefHat, Eye, EyeOff, Lock,
  Shield, MessageSquare, Loader2, Crown, Award
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
  current_tier: 'bronze' | 'silver' | 'gold';
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

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP entrance animations for welcome screen
    if (step === 0 && welcomeRef.current) {
      const ctx = gsap.context(() => {
        // Staggered text reveal animation
        gsap.fromTo('.text-reveal-inner',
          { y: '100%' },
          { 
            y: '0%', 
            duration: 1.2, 
            stagger: 0.2, 
            ease: "power3.out",
            delay: 0.3
          }
        );

        // Benefits cards animation
        gsap.fromTo('.benefit-card',
          { y: 60, opacity: 0, scale: 0.9 },
          { 
            y: 0, 
            opacity: 1, 
            scale: 1,
            duration: 1, 
            stagger: 0.15, 
            ease: "back.out(1.7)",
            delay: 1
          }
        );

        // Button entrance
        gsap.fromTo('.cta-button',
          { y: 40, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 1, 
            ease: "power3.out",
            delay: 1.8
          }
        );
      });

      return () => ctx.revert();
    }
  }, [step]);

  useEffect(() => {
    // Form entrance animation
    if (step === 1 && formRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(formRef.current.children,
          { y: 40, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 0.8, 
            stagger: 0.1, 
            ease: "power3.out"
          }
        );
      });

      return () => ctx.revert();
    }
  }, [step, authMode]);

  // Curtain transition effect
  const curtainTransition = (callback: () => void) => {
    if (!curtainRef.current) return;
    
    gsap.timeline()
      .to(curtainRef.current, {
        y: "0%",
        duration: 0.6,
        ease: "power4.inOut"
      })
      .call(() => {
        callback();
      })
      .to(curtainRef.current, {
        y: "-100%",
        duration: 0.6,
        ease: "power4.inOut",
        delay: 0.1
      });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleEmailCheck = async (email: string) => {
    if (!email || email.length < 3) return;

    try {
      const customer = await CustomerService.getCustomerByEmail(restaurant.id, email);
      if (customer) {
        setExistingCustomer(customer);
        setAuthMode('login');
      } else {
        setExistingCustomer(null);
        setAuthMode('signup');
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

  const benefits = [
    {
      icon: Gift,
      title: 'Earn Points',
      description: 'Get points with every purchase',
      gradient: 'from-green-400 to-emerald-500'
    },
    {
      icon: Star,
      title: 'Exclusive Rewards',
      description: 'Redeem points for amazing rewards',
      gradient: 'from-blue-400 to-indigo-500'
    },
    {
      icon: Crown,
      title: 'VIP Status',
      description: 'Unlock higher tiers for better perks',
      gradient: 'from-purple-400 to-pink-500'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] relative overflow-hidden">
      {/* Curtain Transition Overlay */}
      <div 
        ref={curtainRef}
        className="curtain"
      />

      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full float-element" />
        <div className="absolute bottom-40 left-10 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-full float-element" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 rounded-full float-element" style={{ animationDelay: '4s' }} />
      </div>

      {/* Modern Header */}
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
            <div className="w-12 h-12 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-[var(--radius-md)] flex items-center justify-center shadow-[var(--shadow-soft)]">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-[var(--color-dark)] text-lg">{restaurant.name}</h1>
              <p className="text-xs text-gray-500 font-medium">Loyalty Program</p>
            </div>
          </motion.div>
          
          {step > 0 && (
            <motion.button
              onClick={() => curtainTransition(() => setStep(0))}
              className="p-3 text-gray-600 hover:bg-white/20 rounded-[var(--radius-md)] transition-all duration-300 btn-magnetic"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
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
                {/* Hero Section */}
                <div className="space-y-8">
                  {/* Animated Chef Hat */}
                  <motion.div 
                    className="w-32 h-32 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-full flex items-center justify-center mx-auto shadow-[var(--shadow-strong)] relative"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 1.2, ease: "back.out(1.7)" }}
                  >
                    <ChefHat className="w-16 h-16 text-white" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                  </motion.div>
                  
                  {/* Welcome Text with Reveal Animation */}
                  <div className="space-y-4">
                    <div className="text-reveal">
                      <motion.h1 
                        className="text-reveal-inner text-5xl font-bold text-[var(--color-dark)] leading-tight"
                        initial={{ y: '100%' }}
                        animate={{ y: '0%' }}
                        transition={{ delay: 0.5, duration: 1, ease: [0.4, 0, 0.2, 1] }}
                      >
                        Welcome
                      </motion.h1>
                    </div>
                    <div className="text-reveal">
                      <motion.p 
                        className="text-reveal-inner text-lg text-gray-600 leading-relaxed font-medium max-w-sm mx-auto"
                        initial={{ y: '100%' }}
                        animate={{ y: '0%' }}
                        transition={{ delay: 0.7, duration: 1, ease: [0.4, 0, 0.2, 1] }}
                      >
                        Manage your rewards with ease using our restaurant loyalty system.
                      </motion.p>
                    </div>
                  </div>
                </div>

                {/* Benefits Grid */}
                <div className="space-y-4">
                  {benefits.map((benefit, index) => {
                    const Icon = benefit.icon;
                    return (
                      <motion.div
                        key={index}
                        className="benefit-card flex items-center gap-4 p-6 card-modern rounded-[var(--radius-md)]"
                        whileHover={{ 
                          scale: 1.02, 
                          x: 8,
                          transition: { duration: 0.2 }
                        }}
                      >
                        <div className={`w-14 h-14 bg-gradient-to-br ${benefit.gradient} rounded-[var(--radius-md)] flex items-center justify-center shadow-[var(--shadow-soft)]`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-[var(--color-dark)] text-lg">{benefit.title}</p>
                          <p className="text-gray-600">{benefit.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* CTA Button */}
                <motion.button
                  onClick={() => curtainTransition(() => setStep(1))}
                  className="cta-button btn-modern w-full bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white font-bold py-6 px-8 rounded-[var(--radius-md)] hover:shadow-[var(--shadow-strong)] transition-all duration-300 text-lg"
                  whileHover={{ 
                    scale: 1.02, 
                    y: -2,
                    transition: { duration: 0.2 }
                  }}
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
                className="card-modern rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-strong)]"
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
                    transition={{ duration: 0.3 }}
                  >
                    {error}
                  </motion.div>
                )}

                <div className="p-8 space-y-8">
                  {/* Header */}
                  <motion.div 
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-soft)]">
                      {authMode === 'login' ? <Shield className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-white" />}
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--color-dark)] mb-2">
                      {authMode === 'login' ? 'Welcome Back!' : 'Join Our Program'}
                    </h2>
                    <p className="text-gray-600">
                      {authMode === 'login' ? 'Sign in to access your loyalty account' : 'Create your account and start earning rewards'}
                    </p>
                  </motion.div>

                  {/* Email Field */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  >
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
                        className="focus-modern w-full pl-12 pr-4 py-4 border border-gray-200 rounded-[var(--radius-md)] bg-gray-50 focus:bg-white text-lg transition-all duration-300"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </motion.div>

                  {/* Existing Customer Detection */}
                  <AnimatePresence>
                    {existingCustomer && (
                      <motion.div 
                        className="bg-blue-50 border border-blue-200 rounded-[var(--radius-md)] p-4"
                        initial={{ opacity: 0, height: 0, scale: 0.9 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-[var(--radius-sm)] flex items-center justify-center text-white font-bold">
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
                    {authMode === 'signup' && (
                      <motion.div 
                        className="space-y-6"
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
                              className="focus-modern w-full px-4 py-3 border border-gray-200 rounded-[var(--radius-sm)] bg-gray-50 focus:bg-white transition-all duration-300"
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
                              className="focus-modern w-full px-4 py-3 border border-gray-200 rounded-[var(--radius-sm)] bg-gray-50 focus:bg-white transition-all duration-300"
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
                              className="focus-modern w-full pl-12 pr-4 py-3 border border-gray-200 rounded-[var(--radius-sm)] bg-gray-50 focus:bg-white transition-all duration-300"
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
                              className="focus-modern w-full pl-12 pr-4 py-3 border border-gray-200 rounded-[var(--radius-sm)] bg-gray-50 focus:bg-white transition-all duration-300"
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
                    className="btn-modern w-full bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white font-bold py-5 px-6 rounded-[var(--radius-md)] hover:shadow-[var(--shadow-medium)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
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

                  {/* Toggle Auth Mode */}
                  <motion.div 
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <button
                      onClick={() => {
                        setAuthMode(authMode === 'login' ? 'signup' : 'login');
                        setError('');
                      }}
                      className="text-[#1E2A78] hover:text-[#3B4B9A] font-semibold transition-colors duration-300 btn-magnetic"
                    >
                      {authMode === 'login' 
                        ? "Don't have an account? Sign up" 
                        : 'Already have an account? Sign in'
                      }
                    </button>
                  </motion.div>
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