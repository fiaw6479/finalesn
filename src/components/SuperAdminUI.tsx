import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Building, MessageSquare, BarChart3, Settings,
  Search, Filter, Eye, Edit3, Trash2, Plus, RefreshCw,
  AlertCircle, CheckCircle, Crown, Award, ChefHat, X,
  TrendingUp, DollarSign, Gift, Clock, User, Mail,
  Phone, Calendar, MapPin, Star, Zap, Target, Loader2,
  MoreVertical, Ban, CheckCircle2, XCircle, Lock,
  Unlock, Database, Activity, Globe, Monitor
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: any;
  created_at: string;
  updated_at: string;
  owner?: {
    email: string;
    user_metadata: any;
  };
  stats?: {
    totalCustomers: number;
    totalRewards: number;
    totalRevenue: number;
    totalPointsIssued: number;
  };
}

interface Customer {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  total_points: number;
  lifetime_points: number;
  current_tier: string;
  visit_count: number;
  total_spent: number;
  created_at: string;
  restaurant?: {
    name: string;
    slug: string;
  };
}

interface SupportTicket {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  restaurant?: {
    name: string;
    slug: string;
  };
}

interface SystemStats {
  totalRestaurants: number;
  totalCustomers: number;
  totalRevenue: number;
  totalPointsIssued: number;
  activeTickets: number;
  monthlyGrowth: {
    restaurants: number;
    customers: number;
    revenue: number;
  };
}

const SuperAdminUI: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants' | 'customers' | 'support' | 'analytics'>('overview');
  
  // Data states
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, activeTab]);

  const checkAuthentication = () => {
    const authenticated = localStorage.getItem('super_admin_authenticated');
    const loginTime = localStorage.getItem('super_admin_login_time');
    
    if (authenticated && loginTime) {
      const loginDate = new Date(loginTime);
      const now = new Date();
      const hoursSinceLogin = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
      
      // Session expires after 8 hours
      if (hoursSinceLogin < 8) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('super_admin_authenticated');
        localStorage.removeItem('super_admin_login_time');
        window.location.href = '/super-admin-login';
      }
    } else {
      window.location.href = '/super-admin-login';
    }
    setLoading(false);
  };

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      switch (activeTab) {
        case 'overview':
          await fetchSystemStats();
          break;
        case 'restaurants':
          await fetchRestaurants();
          break;
        case 'customers':
          await fetchCustomers();
          break;
        case 'support':
          await fetchSupportTickets();
          break;
        case 'analytics':
          await fetchSystemStats();
          await fetchRestaurants();
          break;
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to fetch data');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Get total restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('id, created_at');

      if (restaurantsError) throw restaurantsError;

      // Get total customers across all restaurants
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, total_spent, created_at');

      if (customersError) throw customersError;

      // Get total points issued
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('points')
        .gt('points', 0);

      if (transactionsError) throw transactionsError;

      // Get active support tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id')
        .in('status', ['open', 'in_progress']);

      if (ticketsError) throw ticketsError;

      // Calculate monthly growth
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const newRestaurantsThisMonth = restaurantsData?.filter(r => 
        new Date(r.created_at) >= lastMonth
      ).length || 0;
      
      const newCustomersThisMonth = customersData?.filter(c => 
        new Date(c.created_at) >= lastMonth
      ).length || 0;

      const totalRevenue = customersData?.reduce((sum, c) => sum + c.total_spent, 0) || 0;
      const totalPointsIssued = transactionsData?.reduce((sum, t) => sum + t.points, 0) || 0;

      setSystemStats({
        totalRestaurants: restaurantsData?.length || 0,
        totalCustomers: customersData?.length || 0,
        totalRevenue,
        totalPointsIssued,
        activeTickets: ticketsData?.length || 0,
        monthlyGrowth: {
          restaurants: newRestaurantsThisMonth,
          customers: newCustomersThisMonth,
          revenue: 0 // Would need more complex calculation
        }
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchRestaurants = async () => {
    try {
      // Get restaurants with owner information and stats
      const { data: restaurantsData, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          owner:users!restaurants_owner_id_fkey(email, user_metadata)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch stats for each restaurant
      const restaurantsWithStats = await Promise.all(
        (restaurantsData || []).map(async (restaurant) => {
          try {
            // Get customer count
            const { data: customers } = await supabase
              .from('customers')
              .select('id, total_spent')
              .eq('restaurant_id', restaurant.id);

            // Get rewards count
            const { data: rewards } = await supabase
              .from('rewards')
              .select('id')
              .eq('restaurant_id', restaurant.id);

            // Get points issued
            const { data: transactions } = await supabase
              .from('transactions')
              .select('points')
              .eq('restaurant_id', restaurant.id)
              .gt('points', 0);

            const stats = {
              totalCustomers: customers?.length || 0,
              totalRewards: rewards?.length || 0,
              totalRevenue: customers?.reduce((sum, c) => sum + c.total_spent, 0) || 0,
              totalPointsIssued: transactions?.reduce((sum, t) => sum + t.points, 0) || 0
            };

            return { ...restaurant, stats };
          } catch (error) {
            console.error(`Error fetching stats for restaurant ${restaurant.id}:`, error);
            return {
              ...restaurant,
              stats: {
                totalCustomers: 0,
                totalRewards: 0,
                totalRevenue: 0,
                totalPointsIssued: 0
              }
            };
          }
        })
      );

      setRestaurants(restaurantsWithStats);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchSupportTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupportTickets(data || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('super_admin_authenticated');
    localStorage.removeItem('super_admin_login_time');
    window.location.href = '/super-admin-login';
  };

  const handleDeleteRestaurant = async (restaurantId: string) => {
    if (!confirm('Are you sure you want to delete this restaurant? This will delete ALL associated data including customers, rewards, and transactions. This action cannot be undone.')) {
      return;
    }

    try {
      // Delete restaurant (cascade will handle related data)
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);

      if (error) throw error;

      await fetchRestaurants();
      alert('Restaurant deleted successfully');
    } catch (error: any) {
      console.error('Error deleting restaurant:', error);
      alert('Failed to delete restaurant: ' + error.message);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, assigned_to_admin: 'Super Admin' })
        .eq('id', ticketId);

      if (error) throw error;

      await fetchSupportTickets();
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-500">System-wide oversight and control</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAllData}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Super Admin</p>
                <p className="text-xs text-gray-500">System Administrator</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'System Overview', icon: BarChart3 },
              { id: 'restaurants', label: 'Restaurants', icon: Building },
              { id: 'customers', label: 'All Customers', icon: Users },
              { id: 'support', label: 'Support Tickets', icon: MessageSquare },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* System Overview Tab */}
        {activeTab === 'overview' && systemStats && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">System Overview</h2>
              <p className="text-gray-600">Complete overview of the TableLoyalty platform</p>
            </div>

            {/* System Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Restaurants</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalRestaurants}</p>
                  </div>
                </div>
                <p className="text-xs text-green-600">+{systemStats.monthlyGrowth.restaurants} this month</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalCustomers.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-xs text-green-600">+{systemStats.monthlyGrowth.customers} this month</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(systemStats.totalRevenue)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Across all restaurants</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Points Issued</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalPointsIssued.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Total loyalty points</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Tickets</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.activeTickets}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Pending support</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Database</p>
                    <p className="text-sm text-green-700">Operational</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <Activity className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">API Services</p>
                    <p className="text-sm text-green-700">All systems running</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <Globe className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Platform Status</p>
                    <p className="text-sm text-green-700">Fully operational</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Restaurant Management</h2>
                <p className="text-gray-600">Manage all restaurants on the platform</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Restaurants Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {restaurants
                .filter(restaurant => 
                  restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  restaurant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  restaurant.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((restaurant) => (
                <div key={restaurant.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-xl flex items-center justify-center">
                          <ChefHat className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                          <p className="text-sm text-gray-600">/{restaurant.slug}</p>
                          <p className="text-xs text-gray-500">{restaurant.owner?.email}</p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Restaurant Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-blue-600">Customers</span>
                        </div>
                        <p className="text-lg font-bold text-blue-900">{restaurant.stats?.totalCustomers || 0}</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600">Revenue</span>
                        </div>
                        <p className="text-lg font-bold text-green-900">{formatCurrency(restaurant.stats?.totalRevenue || 0)}</p>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Gift className="h-4 w-4 text-purple-600" />
                          <span className="text-xs text-purple-600">Rewards</span>
                        </div>
                        <p className="text-lg font-bold text-purple-900">{restaurant.stats?.totalRewards || 0}</p>
                      </div>
                      
                      <div className="bg-yellow-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="h-4 w-4 text-yellow-600" />
                          <span className="text-xs text-yellow-600">Points</span>
                        </div>
                        <p className="text-lg font-bold text-yellow-900">{restaurant.stats?.totalPointsIssued?.toLocaleString() || 0}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedRestaurant(restaurant);
                          setShowRestaurantModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      
                      <button
                        onClick={() => handleDeleteRestaurant(restaurant.id)}
                        className="flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Created Date */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Created {formatDate(restaurant.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
                <p className="text-gray-600">View all customers across all restaurants</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Restaurant</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Tier</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Points</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Spent</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Visits</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers
                      .filter(customer => 
                        customer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        customer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        customer.restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {customer.first_name[0]}{customer.last_name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{customer.first_name} {customer.last_name}</p>
                              <p className="text-sm text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{customer.restaurant?.name}</p>
                          <p className="text-sm text-gray-500">/{customer.restaurant?.slug}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            customer.current_tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                            customer.current_tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {customer.current_tier === 'gold' ? <Crown className="h-3 w-3" /> :
                             customer.current_tier === 'silver' ? <Award className="h-3 w-3" /> :
                             <ChefHat className="h-3 w-3" />}
                            {customer.current_tier.charAt(0).toUpperCase() + customer.current_tier.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{customer.total_points.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{customer.lifetime_points.toLocaleString()} lifetime</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{formatCurrency(customer.total_spent)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{customer.visit_count}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-500">{formatDate(customer.created_at)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
                <p className="text-gray-600">Manage support requests from all restaurants</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Support Tickets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {supportTickets
                .filter(ticket => 
                  ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ticket.restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{ticket.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                      <p className="text-xs text-gray-500">From: {ticket.restaurant?.name}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{formatDate(ticket.created_at)}</p>
                    <div className="flex gap-2">
                      {ticket.status === 'open' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(ticket.id, 'in_progress')}
                          className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors"
                        >
                          Start Progress
                        </button>
                      )}
                      {ticket.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(ticket.id, 'resolved')}
                          className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {ticket.status === 'resolved' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(ticket.id, 'closed')}
                          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Close Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && systemStats && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Analytics</h2>
              <p className="text-gray-600">Comprehensive analytics across all restaurants</p>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Growth */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Growth</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Restaurants</span>
                    <span className="font-bold text-gray-900">{systemStats.totalRestaurants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Customers</span>
                    <span className="font-bold text-gray-900">{systemStats.totalCustomers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Platform Revenue</span>
                    <span className="font-bold text-gray-900">{formatCurrency(systemStats.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Points Issued</span>
                    <span className="font-bold text-gray-900">{systemStats.totalPointsIssued.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Top Performing Restaurants */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Restaurants</h3>
                <div className="space-y-3">
                  {restaurants
                    .sort((a, b) => (b.stats?.totalRevenue || 0) - (a.stats?.totalRevenue || 0))
                    .slice(0, 5)
                    .map((restaurant, index) => (
                    <div key={restaurant.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{restaurant.name}</p>
                        <p className="text-sm text-gray-500">{formatCurrency(restaurant.stats?.totalRevenue || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{restaurant.stats?.totalCustomers || 0}</p>
                        <p className="text-xs text-gray-500">customers</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Restaurant Details Modal */}
      {showRestaurantModal && selectedRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Restaurant Details</h3>
              <button
                onClick={() => {
                  setShowRestaurantModal(false);
                  setSelectedRestaurant(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{selectedRestaurant.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Slug</p>
                    <p className="font-medium text-gray-900">/{selectedRestaurant.slug}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Owner Email</p>
                    <p className="font-medium text-gray-900">{selectedRestaurant.owner?.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedRestaurant.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-xl font-bold text-gray-900">{selectedRestaurant.stats?.totalCustomers || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedRestaurant.stats?.totalRevenue || 0)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Total Rewards</p>
                    <p className="text-xl font-bold text-gray-900">{selectedRestaurant.stats?.totalRewards || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Points Issued</p>
                    <p className="text-xl font-bold text-gray-900">{selectedRestaurant.stats?.totalPointsIssued?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Loyalty Settings</h4>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Point Value (AED)</span>
                    <span className="font-medium text-gray-900">{selectedRestaurant.settings?.pointValueAED || 0.05}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Blanket Mode</span>
                    <span className="font-medium text-gray-900">
                      {selectedRestaurant.settings?.blanketMode?.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {selectedRestaurant.settings?.blanketMode?.enabled && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mode Type</span>
                      <span className="font-medium text-gray-900">
                        {selectedRestaurant.settings.blanketMode.type?.charAt(0).toUpperCase() + selectedRestaurant.settings.blanketMode.type?.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUI;