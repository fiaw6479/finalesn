import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  Bell, Menu, Home, Gift, Clock, User, QrCode, TrendingUp,
  Crown, Award, ChefHat, Sparkles, ArrowRight, Star, Zap,
  Calendar, MapPin, Phone, Mail, Settings, LogOut, Copy,
  Check, Share2, Wallet, CreditCard, Trophy, Target
} from 'lucide-react';
import { CustomerService } from '../services/customerService';
import { RewardService } from '../services/rewardService';
import { supabase } from '../lib/supabase';
import CustomerOnboarding from './CustomerOnboarding';
import CustomerRedemptionModal from './CustomerRedemptionModal';

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

interface Reward {
  id: string;
  name: string;
  description?: string;
  points_required: number;
  category: string;
  min_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  is_active: boolean;
}

interface Transaction {
  id: string;
  type: string;
  points: number;
  amount_spent?: number;
  description?: string;
  created_at: string;
}

interface CustomerWalletProps {
  isDemo?: boolean;
  onClose?: () => void;
}

const CustomerWallet: React.FC<CustomerWalletProps> = ({ isDemo = false, onClose }) => {
  const { restaurantSlug } = useParams();
  const navigate = useNavigate();
  
  // Core state
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI state
  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  
  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const pointsCardRef = useRef<HTMLDivElement>(null);
  const floatingElementsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeWallet();
  }, [restaurantSlug]);

  useEffect(() => {
    if (customer && pointsCardRef.current) {
      // Animate points card entrance
      gsap.fromTo(pointsCardRef.current,
        { y: 60, opacity: 0, scale: 0.9 },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          duration: 1.2, 
          ease: "power3.out",
          delay: 0.3
        }
      );
    }
  }, [customer]);

  useEffect(() => {
    // Floating elements animation
    if (floatingElementsRef.current) {
      const elements = floatingElementsRef.current.children;
      Array.from(elements).forEach((element, index) => {
        gsap.to(element, {
          y: "random(-20, 20)",
          x: "random(-10, 10)",
          rotation: "random(-5, 5)",
          duration: "random(3, 6)",
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
          delay: index * 0.5
        });
      });
    }
  }, []);

  const initializeWallet = async () => {
    try {
      setLoading(true);
      setError('');

      if (isDemo) {
        // Demo mode - use mock data
        setRestaurant({
          id: 'demo',
          name: 'VOYA Demo Restaurant',
          slug: 'demo',
          settings: {}
        });
        setCustomer({
          id: 'demo-customer',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          total_points: 1250,
          lifetime_points: 2500,
          current_tier: 'gold',
          tier_progress: 75,
          visit_count: 12,
          total_spent: 850,
          created_at: new Date().toISOString()
        });
        setRewards([
          {
            id: '1',
            name: 'Free Drink',
            description: 'Any beverage from our menu',
            points_required: 75,
            category: 'beverage',
            min_tier: 'bronze',
            is_active: true
          },
          {
            id: '2',
            name: 'Free Appetizer',
            description: 'Choose any appetizer',
            points_required: 100,
            category: 'food',
            min_tier: 'bronze',
            is_active: true
          },
          {
            id: '3',
            name: 'Free Dessert',
            description: 'Sweet treats on us',
            points_required: 150,
            category: 'food',
            min_tier: 'bronze',
            is_active: true
          }
        ]);
        setTransactions([
          {
            id: '1',
            type: 'purchase',
            points: 25,
            amount_spent: 45.50,
            description: 'Order #1234',
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: '2',
            type: 'redemption',
            points: -75,
            description: 'Redeemed: Free Drink',
            created_at: new Date(Date.now() - 172800000).toISOString()
          }
        ]);
        setLoading(false);
        return;
      }

      // Real mode - fetch from backend
      let targetSlug = restaurantSlug;
      if (!targetSlug) {
        // Try to get from URL or default
        const pathParts = window.location.pathname.split('/');
        targetSlug = pathParts[pathParts.length - 1] || 'demo';
      }

      // Fetch restaurant
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', targetSlug)
        .single();

      if (restaurantError || !restaurantData) {
        setError('Restaurant not found');
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      // Check if customer exists in localStorage or show onboarding
      const storedCustomerId = localStorage.getItem(`customer_${restaurantData.id}`);
      if (storedCustomerId) {
        await fetchCustomerData(restaurantData.id, storedCustomerId);
      } else {
        setShowOnboarding(true);
      }

    } catch (err: any) {
      console.error('Error initializing wallet:', err);
      setError(err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerData = async (restaurantId: string, customerId: string) => {
    try {
      // Fetch customer
      const customerData = await CustomerService.getCustomer(restaurantId, customerId);
      if (!customerData) {
        setError('Customer not found');
        return;
      }
      setCustomer(customerData);

      // Fetch available rewards
      const rewardsData = await RewardService.getAvailableRewards(restaurantId, customerId);
      setRewards(rewardsData);

      // Fetch transaction history
      const transactionsData = await CustomerService.getCustomerTransactions(restaurantId, customerId);
      setTransactions(transactionsData);

    } catch (err: any) {
      console.error('Error fetching customer data:', err);
      setError(err.message || 'Failed to load customer data');
    }
  };

  const handleOnboardingComplete = async (customerData: Customer) => {
    if (!restaurant) return;

    try {
      // Store customer ID for future visits
      localStorage.setItem(`customer_${restaurant.id}`, customerData.id);
      
      // Curtain transition to reveal dashboard
      if (curtainRef.current) {
        gsap.timeline()
          .to(curtainRef.current, {
            y: "0%",
            duration: 0.6,
            ease: "power4.inOut"
          })
          .call(() => {
            setCustomer(customerData);
            setShowOnboarding(false);
            // Fetch additional data
            fetchCustomerData(restaurant.id, customerData.id);
          })
          .to(curtainRef.current, {
            y: "-100%",
            duration: 0.6,
            ease: "power4.inOut",
            delay: 0.1
          });
      } else {
        setCustomer(customerData);
        setShowOnboarding(false);
        fetchCustomerData(restaurant.id, customerData.id);
      }
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setError(err.message || 'Failed to complete setup');
    }
  };

  const handleRedemption = async () => {
    if (!selectedReward || !customer || !restaurant) return;

    try {
      await RewardService.redeemReward(restaurant.id, customer.id, selectedReward.id);
      
      // Refresh customer data
      await fetchCustomerData(restaurant.id, customer.id);
      
      setShowRedemptionModal(false);
      setSelectedReward(null);
    } catch (err: any) {
      console.error('Error redeeming reward:', err);
      alert(err.message || 'Failed to redeem reward');
    }
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return { 
          name: 'Platinum', 
          icon: Sparkles, 
          color: 'from-purple-400 to-pink-400',
          textColor: 'text-purple-600',
          bgColor: 'bg-purple-100'
        };
      case 'gold':
        return { 
          name: 'Gold', 
          icon: Crown, 
          color: 'from-yellow-400 to-orange-400',
          textColor: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        };
      case 'silver':
        return { 
          name: 'Silver', 
          icon: Award, 
          color: 'from-gray-300 to-gray-400',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-100'
        };
      default:
        return { 
          name: 'Bronze', 
          icon: ChefHat, 
          color: 'from-orange-400 to-red-400',
          textColor: 'text-orange-600',
          bgColor: 'bg-orange-100'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyQRCode = async () => {
    try {
      const qrText = `VOYA-${customer?.id}-${restaurant?.id}`;
      await navigator.clipboard.writeText(qrText);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy QR code:', err);
    }
  };

  // Show onboarding if needed
  if (showOnboarding && restaurant) {
    return (
      <>
        <div 
          ref={curtainRef}
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] transform translate-y-full"
        />
        <CustomerOnboarding 
          restaurant={restaurant} 
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="stellar-loader w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-600">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#1E2A78] text-white rounded-xl hover:bg-[#3B4B9A] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!customer || !restaurant) {
    return null;
  }

  const tierInfo = getTierInfo(customer.current_tier);
  const TierIcon = tierInfo.icon;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] relative overflow-hidden">
      {/* Curtain for transitions */}
      <div 
        ref={curtainRef}
        className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] transform translate-y-full pointer-events-none"
      />

      {/* Floating background elements */}
      <div ref={floatingElementsRef} className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full" />
        <div className="absolute bottom-40 left-10 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 rounded-full" />
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
          
          <div className="flex items-center gap-3">
            <motion.button
              className="p-3 text-gray-600 hover:bg-white/20 rounded-xl transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-5 h-5" />
            </motion.button>
            
            {isDemo && onClose && (
              <motion.button
                onClick={onClose}
                className="p-3 text-gray-600 hover:bg-white/20 rounded-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pt-20 pb-24 px-6">
        <LayoutGroup>
          <AnimatePresence mode="wait">
            {/* Home Tab */}
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "power2.out" }}
                className="space-y-8"
              >
                {/* Welcome Section */}
                <motion.div 
                  className="text-center space-y-4"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.8, ease: "power2.out" }}
                >
                  <h2 className="text-2xl font-bold text-[var(--color-dark)]">
                    Welcome back, {customer.first_name}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${tierInfo.bgColor} flex items-center justify-center`}>
                      <TierIcon className={`w-4 h-4 ${tierInfo.textColor}`} />
                    </div>
                    <span className={`font-semibold ${tierInfo.textColor}`}>
                      {tierInfo.name} Member
                    </span>
                  </div>
                </motion.div>

                {/* Points Card */}
                <motion.div
                  ref={pointsCardRef}
                  className="relative"
                  layout
                >
                  <div className="card-modern rounded-3xl p-8 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] text-white relative overflow-hidden shadow-2xl">
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-white/80 text-sm font-medium">Available Points</p>
                          <motion.p 
                            className="text-4xl font-bold"
                            key={customer.total_points}
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.6, ease: "power2.out" }}
                          >
                            {customer.total_points.toLocaleString()}
                          </motion.p>
                        </div>
                        <motion.button
                          onClick={() => setShowQRCode(true)}
                          className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all duration-300"
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <QrCode className="w-7 h-7" />
                        </motion.button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/60 text-xs">Tier Progress</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-white rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${customer.tier_progress}%` }}
                                transition={{ delay: 0.5, duration: 1, ease: "power2.out" }}
                              />
                            </div>
                            <span className="text-white/80 text-xs font-medium">{customer.tier_progress}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-xs">Total Visits</p>
                          <p className="text-white font-semibold">{customer.visit_count}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Stats Grid */}
                <motion.div 
                  className="grid grid-cols-2 gap-4"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "power2.out" }}
                >
                  <div className="card-modern rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Lifetime Points</p>
                    <p className="text-2xl font-bold text-[var(--color-dark)]">{customer.lifetime_points.toLocaleString()}</p>
                  </div>
                  
                  <div className="card-modern rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Total Spent</p>
                    <p className="text-2xl font-bold text-[var(--color-dark)]">{customer.total_spent} AED</p>
                  </div>
                </motion.div>

                {/* Available Rewards Preview */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8, ease: "power2.out" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Gift className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--color-dark)]">Available Rewards</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('rewards')}
                      className="text-[#1E2A78] font-semibold text-sm hover:text-[#3B4B9A] transition-colors"
                    >
                      View All
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {rewards.slice(0, 3).map((reward, index) => (
                      <motion.div
                        key={reward.id}
                        className="card-modern rounded-2xl p-4 flex items-center justify-between hover:shadow-lg transition-all duration-300"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-[var(--color-dark)]">{reward.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-[#1E2A78]">{reward.points_required} points</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              {reward.category}
                            </span>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => {
                            setSelectedReward(reward);
                            setShowRedemptionModal(true);
                          }}
                          disabled={customer.total_points < reward.points_required}
                          className="px-4 py-2 bg-[#1E2A78] text-white rounded-xl text-sm font-medium hover:bg-[#3B4B9A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Redeem
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
              <motion.div
                key="rewards"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "power2.out" }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-[var(--color-dark)] mb-2">Rewards</h2>
                  <p className="text-gray-600">Redeem your points for amazing rewards</p>
                </div>

                <div className="space-y-4">
                  {rewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      className="card-modern rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-[var(--color-dark)] text-lg mb-2">{reward.name}</h3>
                          {reward.description && (
                            <p className="text-gray-600 mb-3">{reward.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-[#1E2A78]">{reward.points_required} points</span>
                            <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                              {reward.category}
                            </span>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => {
                            setSelectedReward(reward);
                            setShowRedemptionModal(true);
                          }}
                          disabled={customer.total_points < reward.points_required}
                          className="px-6 py-3 bg-[#1E2A78] text-white rounded-xl font-semibold hover:bg-[#3B4B9A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Redeem
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "power2.out" }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-[var(--color-dark)] mb-2">Transaction History</h2>
                  <p className="text-gray-600">Your recent activity</p>
                </div>

                <div className="space-y-3">
                  {transactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      className="card-modern rounded-2xl p-4 flex items-center justify-between"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          transaction.points > 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.points > 0 ? (
                            <TrendingUp className={`w-5 h-5 ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`} />
                          ) : (
                            <Gift className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--color-dark)]">
                            {transaction.description || transaction.type}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(transaction.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                        </p>
                        {transaction.amount_spent && (
                          <p className="text-sm text-gray-500">{transaction.amount_spent} AED</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "power2.out" }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                    {customer.first_name[0]}{customer.last_name[0]}
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--color-dark)]">
                    {customer.first_name} {customer.last_name}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <TierIcon className={`w-5 h-5 ${tierInfo.textColor}`} />
                    <span className={`font-semibold ${tierInfo.textColor}`}>
                      {tierInfo.name} Member
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="card-modern rounded-2xl p-4 flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-[var(--color-dark)]">{customer.email}</span>
                  </div>
                  
                  {customer.phone && (
                    <div className="card-modern rounded-2xl p-4 flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-[var(--color-dark)]">{customer.phone}</span>
                    </div>
                  )}
                  
                  <div className="card-modern rounded-2xl p-4 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-[var(--color-dark)]">
                      Member since {formatDate(customer.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>

      {/* Bottom Navigation */}
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/10 px-6 py-4"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="flex items-center justify-around">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'rewards', icon: Gift, label: 'Rewards' },
            { id: 'history', icon: Clock, label: 'History' },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 ${
                  isActive ? 'text-[#1E2A78]' : 'text-gray-500'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-[#1E2A78]' : 'text-gray-400'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-[#1E2A78]' : 'text-gray-500'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    className="w-1 h-1 bg-[#1E2A78] rounded-full"
                    layoutId="activeTab"
                    transition={{ duration: 0.3, ease: "power2.out" }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.nav>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQRCode(false)}
          >
            <motion.div
              className="card-modern rounded-3xl p-8 max-w-sm w-full text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-[var(--color-dark)] mb-6">Your QR Code</h3>
              
              <div className="w-48 h-48 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <QrCode className="w-24 h-24 text-gray-400" />
              </div>
              
              <p className="text-gray-600 mb-4">Show this to staff to earn points</p>
              
              <div className="flex gap-3">
                <button
                  onClick={copyQRCode}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  {qrCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {qrCopied ? 'Copied!' : 'Copy Code'}
                </button>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="flex-1 py-3 px-4 bg-[#1E2A78] text-white rounded-xl hover:bg-[#3B4B9A] transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redemption Modal */}
      <AnimatePresence>
        {showRedemptionModal && selectedReward && (
          <CustomerRedemptionModal
            reward={selectedReward}
            customer={customer}
            restaurant={restaurant}
            onConfirm={handleRedemption}
            onClose={() => {
              setShowRedemptionModal(false);
              setSelectedReward(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerWallet;