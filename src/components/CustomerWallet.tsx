import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  ChefHat, Phone, User, CheckCircle2, ArrowRight, 
  Gift, Crown, Sparkles, Timer, X, ArrowLeft,
  Loader2, TrendingUp, Award, Heart, Utensils,
  Coffee, CreditCard, MapPin, Clock, Zap, Plus,
  Minus, QrCode, Share2, Copy, Check, AlertCircle, Percent,
  Star, Menu, Bell, Settings, LogOut, Wallet, Home,
  MoreHorizontal, Flame, Target, Calendar, History
} from 'lucide-react';
import { CustomerService } from '../services/customerService';
import { RewardService } from '../services/rewardService';
import { supabase } from '../lib/supabase';
import CustomerOnboarding from './CustomerOnboarding';
import CustomerRedemptionModal from './CustomerRedemptionModal';
import { useAuth } from '../contexts/AuthContext';

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

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  category: string;
  image_url?: string;
  min_tier: 'bronze' | 'silver' | 'gold';
  is_active: boolean;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'bonus' | 'referral' | 'signup' | 'redemption';
  points: number;
  amount_spent?: number;
  description?: string;
  created_at: string;
  reward_id?: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  settings: any;
}

const CustomerWallet: React.FC = () => {
  const { restaurantSlug } = useParams();
  const navigate = useNavigate();
  const { restaurant: authRestaurant } = useAuth();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'rewards' | 'history' | 'profile'>('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsCardRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const rewardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP entrance animations
    if (containerRef.current && customer) {
      gsap.fromTo(containerRef.current.children, 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" }
      );
    }
  }, [customer, activeTab]);

  useEffect(() => {
    // Points card animation
    if (pointsCardRef.current && customer) {
      gsap.fromTo(pointsCardRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: "back.out(1.7)" }
      );
    }
  }, [customer]);

  useEffect(() => {
    // If we have restaurantSlug from URL, fetch by slug
    if (restaurantSlug && !authRestaurant) {
      fetchRestaurant();
    } 
    // If we're in demo mode (no slug but have auth restaurant), use auth restaurant
    else if (!restaurantSlug && authRestaurant) {
      setRestaurant(authRestaurant);
      setShowOnboarding(true);
      setLoading(false);
    }
  }, [restaurantSlug, authRestaurant]);

  useEffect(() => {
    if (restaurant && customer) {
      fetchCustomerData();
    }
  }, [restaurant, customer?.id]);

  const fetchRestaurant = async () => {
    try {
      setLoading(true);
      
      if (restaurantSlug) {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', restaurantSlug)
          .single();

        if (error) throw error;
        setRestaurant(data);
      }
      
      // Check if customer is already logged in (localStorage)
      const restaurantId = restaurantSlug ? restaurant?.id : authRestaurant?.id;
      if (!restaurantId) return;
      
      const savedCustomer = localStorage.getItem(`customer_${restaurantId}`);
      if (savedCustomer) {
        const customerData = JSON.parse(savedCustomer);
        setCustomer(customerData);
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      if (restaurantSlug) navigate('/'); // Only navigate away if this was a real restaurant URL
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerData = async () => {
    if (!restaurant || !customer) return;
    
    try {
      const [rewardsData, transactionsData] = await Promise.all([
        RewardService.getAvailableRewards(restaurant.id, customer.id),
        CustomerService.getCustomerTransactions(restaurant.id, customer.id)
      ]);
      
      setRewards(rewardsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }
  };

  const handleOnboardingComplete = (customerData: Customer) => {
    setCustomer(customerData);
    setShowOnboarding(false);
    localStorage.setItem(`customer_${restaurant!.id}`, JSON.stringify(customerData));
  };

  const handleRedemption = async (reward: Reward) => {
    if (!customer || !restaurant) return;

    try {
      await RewardService.redeemReward(restaurant.id, customer.id, reward.id);
      
      // Refresh customer data
      const updatedCustomer = await CustomerService.getCustomer(restaurant.id, customer.id);
      if (updatedCustomer) {
        setCustomer(updatedCustomer);
        localStorage.setItem(`customer_${restaurant.id}`, JSON.stringify(updatedCustomer));
      }
      
      await fetchCustomerData();
      setShowRedemptionModal(false);
      setSelectedReward(null);
    } catch (error) {
      console.error('Redemption failed:', error);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(`customer_${restaurant!.id}`);
    setCustomer(null);
    setShowOnboarding(true);
    setShowMenu(false);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    
    // Animate tab content
    if (containerRef.current) {
      gsap.fromTo(containerRef.current.children,
        { x: 20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out" }
      );
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-amber-400 via-orange-500 to-amber-600';
      case 'silver': return 'from-slate-400 via-gray-500 to-slate-600';
      case 'gold': return 'from-yellow-400 via-amber-500 to-yellow-600';
      default: return 'from-amber-400 via-orange-500 to-amber-600';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return Award;
      case 'silver': return Crown;
      case 'gold': return Sparkles;
      default: return Award;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return CreditCard;
      case 'bonus': return Gift;
      case 'referral': return Heart;
      case 'signup': return User;
      case 'redemption': return Gift;
      default: return CreditCard;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <ChefHat className="w-10 h-10 text-white" />
            </motion.div>
          </div>
          <motion.p 
            className="text-gray-600 text-lg font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Loading your wallet...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <CustomerOnboarding
        restaurant={restaurant!}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  if (!customer || !restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Unable to load your wallet</p>
          <motion.button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#1E2A78] text-white rounded-2xl hover:bg-[#3B4B9A] transition-colors font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Go Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const TierIcon = getTierIcon(customer.current_tier);
  const tierGradient = getTierColor(customer.current_tier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center shadow-lg">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">{restaurant.name}</h1>
              <p className="text-xs text-gray-500 font-medium">Loyalty Program</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.button 
              className="p-3 text-gray-600 hover:bg-white/50 rounded-2xl transition-all duration-300 relative"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </motion.button>
            <motion.button
              onClick={() => setShowMenu(!showMenu)}
              className="p-3 text-gray-600 hover:bg-white/50 rounded-2xl transition-all duration-300 relative"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Menu className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>

        {/* Enhanced Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              <motion.div 
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" 
                onClick={() => setShowMenu(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div 
                className="absolute right-6 top-20 w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 py-3 z-50"
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {customer.first_name[0]}{customer.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{customer.first_name} {customer.last_name}</p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <TierIcon className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 capitalize">{customer.current_tier} Member</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <motion.button
                  onClick={() => {
                    setActiveTab('profile');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-gray-700 hover:bg-blue-50 transition-all duration-200 group"
                  whileHover={{ x: 5 }}
                >
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Profile Settings</p>
                    <p className="text-xs text-gray-500">Manage your account</p>
                  </div>
                </motion.button>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                <motion.button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-4 px-6 py-4 text-red-600 hover:bg-red-50 transition-all duration-200 group"
                  whileHover={{ x: 5 }}
                >
                  <div className="w-10 h-10 rounded-2xl bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Sign Out</p>
                    <p className="text-xs text-red-500">End your session</p>
                  </div>
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Main Content */}
      <main className="pb-24" ref={containerRef}>
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              className="p-6 space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Enhanced Points Card */}
              <motion.div 
                ref={pointsCardRef}
                className={`bg-gradient-to-br ${tierGradient} rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl`}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {/* Animated Background Elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16"></div>
                <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/5 rounded-full -translate-x-12 -translate-y-12"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <motion.div 
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <TierIcon className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="font-semibold text-lg capitalize">{customer.current_tier} Member</span>
                        <p className="text-white/80 text-sm">Since {formatDate(customer.created_at)}</p>
                      </div>
                    </motion.div>
                    <motion.div 
                      className="text-right"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <p className="text-white/80 text-sm font-medium">Total Visits</p>
                      <p className="text-3xl font-bold">{customer.visit_count}</p>
                    </motion.div>
                  </div>
                  
                  <motion.div 
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p className="text-white/80 text-sm mb-2 font-medium">Available Points</p>
                    <motion.p 
                      className="text-6xl font-bold mb-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                    >
                      {customer.total_points.toLocaleString()}
                    </motion.p>
                    <p className="text-white/70 text-sm">≈ ${(customer.total_points * 0.05).toFixed(2)} value</p>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-white/15 backdrop-blur-sm rounded-2xl p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium">Progress to Next Tier</span>
                      <span className="text-sm font-bold">{customer.tier_progress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                      <motion.div 
                        className="bg-white h-3 rounded-full shadow-lg"
                        initial={{ width: 0 }}
                        animate={{ width: `${customer.tier_progress}%` }}
                        transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Enhanced Quick Stats */}
              <motion.div 
                ref={statsRef}
                className="grid grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, stagger: 0.1 }}
              >
                <motion.div 
                  className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg"
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Lifetime Points</p>
                      <p className="text-2xl font-bold text-gray-900">{customer.lifetime_points.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg"
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <CreditCard className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total Spent</p>
                      <p className="text-2xl font-bold text-gray-900">${customer.total_spent.toFixed(0)}</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Enhanced Available Rewards */}
              {rewards.length > 0 && (
                <motion.div 
                  ref={rewardsRef}
                  className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-lg"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="p-6 border-b border-gray-100/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center">
                          <Gift className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Available Rewards</h3>
                      </div>
                      <motion.button
                        onClick={() => setActiveTab('rewards')}
                        className="text-[#1E2A78] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        View All
                      </motion.button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {rewards.slice(0, 3).map((reward, index) => (
                      <motion.div 
                        key={reward.id} 
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-base">{reward.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-[#1E2A78]">{reward.points_required} points</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
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
                          className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                            customer.total_points >= reward.points_required
                              ? 'bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white hover:shadow-lg'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                          whileHover={customer.total_points >= reward.points_required ? { scale: 1.05 } : {}}
                          whileTap={customer.total_points >= reward.points_required ? { scale: 0.95 } : {}}
                        >
                          Redeem
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Enhanced Recent Activity */}
              {transactions.length > 0 && (
                <motion.div 
                  className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-lg"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="p-6 border-b border-gray-100/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center">
                          <History className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Recent Activity</h3>
                      </div>
                      <motion.button
                        onClick={() => setActiveTab('history')}
                        className="text-[#1E2A78] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        View All
                      </motion.button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {transactions.slice(0, 3).map((transaction, index) => {
                      const Icon = getTransactionIcon(transaction.type);
                      return (
                        <motion.div 
                          key={transaction.id} 
                          className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9 + index * 0.1 }}
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                            <Icon className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {transaction.description || transaction.type}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                          </div>
                          <span className={`text-lg font-bold ${
                            transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'rewards' && (
            <motion.div 
              key="rewards"
              className="p-6 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Available Rewards</h2>
                  <p className="text-gray-600 mt-1">{customer.total_points.toLocaleString()} points available</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Your Tier</p>
                  <div className="flex items-center gap-2">
                    <TierIcon className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-gray-900 capitalize">{customer.current_tier}</span>
                  </div>
                </div>
              </div>

              {rewards.length === 0 ? (
                <motion.div 
                  className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 text-center border border-white/20 shadow-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Gift className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">No Rewards Available</h3>
                  <p className="text-gray-600 text-lg">
                    Keep earning points to unlock amazing rewards!
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {rewards.map((reward, index) => (
                    <motion.div 
                      key={reward.id} 
                      className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-lg"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -5 }}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Gift className="w-7 h-7 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">{reward.name}</h3>
                                <p className="text-gray-600">{reward.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-[#1E2A78]">
                                {reward.points_required} points
                              </span>
                              <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                {reward.category}
                              </span>
                              <span className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium capitalize">
                                {reward.min_tier}+ tier
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <motion.button
                          onClick={() => {
                            setSelectedReward(reward);
                            setShowRedemptionModal(true);
                          }}
                          disabled={customer.total_points < reward.points_required}
                          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                            customer.total_points >= reward.points_required
                              ? 'bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white hover:shadow-xl'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                          whileHover={customer.total_points >= reward.points_required ? { scale: 1.02 } : {}}
                          whileTap={customer.total_points >= reward.points_required ? { scale: 0.98 } : {}}
                        >
                          {customer.total_points >= reward.points_required ? 'Redeem Reward' : 'Not Enough Points'}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              className="p-6 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>

              {transactions.length === 0 ? (
                <motion.div 
                  className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 text-center border border-white/20 shadow-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Clock className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">No Transactions Yet</h3>
                  <p className="text-gray-600 text-lg">
                    Your transaction history will appear here.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction, index) => {
                    const Icon = getTransactionIcon(transaction.type);
                    return (
                      <motion.div 
                        key={transaction.id} 
                        className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
                            <Icon className="w-7 h-7 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg">
                              {transaction.description || transaction.type}
                            </p>
                            <p className="text-sm text-gray-500 font-medium">{formatDate(transaction.created_at)}</p>
                            {transaction.amount_spent && (
                              <p className="text-sm text-gray-600 mt-1">Amount: ${transaction.amount_spent}</p>
                            )}
                          </div>
                          <span className={`text-2xl font-bold ${
                            transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              className="p-6 space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-gray-900">Profile</h2>

              {/* Enhanced Profile Info */}
              <motion.div 
                className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-lg"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-6 border-b border-gray-100/50 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="font-bold text-gray-900 text-lg mb-4">Personal Information</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-3xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {customer.first_name[0]}{customer.last_name[0]}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h4>
                      <p className="text-gray-600 font-medium">{customer.email}</p>
                      {customer.phone && (
                        <p className="text-gray-600">{customer.phone}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <TierIcon className="w-5 h-5 text-amber-500" />
                        <span className="font-semibold text-amber-600 capitalize">{customer.current_tier} Member</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                      <p className="text-sm text-gray-600 font-medium">Member Since</p>
                      <p className="font-bold text-gray-900 text-lg">{formatDate(customer.created_at)}</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
                      <p className="text-sm text-gray-600 font-medium">Current Tier</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <TierIcon className="w-5 h-5 text-amber-500" />
                        <p className="font-bold text-gray-900 text-lg capitalize">{customer.current_tier}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Account Actions */}
              <motion.div 
                className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-lg"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="p-6 border-b border-gray-100/50">
                  <h3 className="font-bold text-gray-900 text-lg">Account</h3>
                </div>
                <div className="p-6 space-y-3">
                  <motion.button 
                    className="w-full flex items-center justify-between p-4 text-gray-700 hover:bg-blue-50 rounded-2xl transition-all duration-300 group"
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                        <Settings className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="font-semibold">Account Settings</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </motion.button>
                  
                  <motion.button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-between p-4 text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-300 group"
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl flex items-center justify-center group-hover:from-red-200 group-hover:to-pink-200 transition-colors">
                        <LogOut className="w-6 h-6 text-red-600" />
                      </div>
                      <span className="font-semibold">Sign Out</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors" />
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Enhanced Bottom Navigation */}
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-white/20 px-6 py-4 shadow-2xl"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'rewards', icon: Gift, label: 'Rewards' },
            { id: 'history', icon: Clock, label: 'History' },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as typeof activeTab)}
                className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'text-[#1E2A78] bg-blue-50'
                    : 'text-gray-600'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold">{tab.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute -top-1 w-2 h-2 bg-[#1E2A78] rounded-full"
                    layoutId="activeTab"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.nav>

      {/* Redemption Modal */}
      <AnimatePresence>
        {showRedemptionModal && selectedReward && (
          <CustomerRedemptionModal
            reward={selectedReward}
            customer={customer}
            restaurant={restaurant}
            onConfirm={() => handleRedemption(selectedReward)}
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