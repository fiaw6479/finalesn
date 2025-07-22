import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChefHat, Users, Building, DollarSign, TrendingUp, Gift, 
  AlertCircle, CheckCircle, RefreshCw, Trash2, Edit3, Plus,
  Search, Filter, Settings, Database, Shield, Zap, MessageSquare,
  Eye, EyeOff, Save, X, Crown, Award, Sparkles, BarChart3,
  Clock, User, Mail, Phone, Calendar, Target, Percent,
  Activity, Globe, Server, Wifi, HardDrive, Loader2, LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemStats {
  totalRestaurants: number;
  activeRestaurants: number;
  totalCustomers: number;
  totalTransactions: number;
  totalPointsIssued: number;
  totalRevenue: number;
  totalRedemptions: number;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: any;
  created_at: string;
  updated_at: string;
  owner_email?: string;
  owner_name?: string;
  customer_count?: number;
  total_revenue?: number;
  points_issued?: number;
  redemptions?: number;
  last_activity?: string;
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
  total_spent: number;
  visit_count: number;
  created_at: string;
  restaurant?: { name: string };
}

interface Transaction {
  id: string;
  restaurant_id: string;
  customer_id: string;
  type: string;
  points: number;
  amount_spent?: number;
  description?: string;
  created_at: string;
  customer?: { first_name: string; last_name: string };
  restaurant?: { name: string };
}

interface SupportTicket {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_by_user_id: string;
  created_at: string;
  restaurant?: { name: string };
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'restaurant_manager' | 'super_admin';
  sender_id: string;
  message: string;
  created_at: string;
}

const SuperAdminUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants' | 'customers' | 'transactions' | 'support' | 'system'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Check super admin authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('super_admin_authenticated');
    if (!isAuthenticated) {
      navigate('/super-admin-login');
      return;
    }
  }, [navigate]);
  
  // Data states
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalRestaurants: 0,
    activeRestaurants: 0,
    totalCustomers: 0,
    totalTransactions: 0,
    totalPointsIssued: 0,
    totalRevenue: 0,
    totalRedemptions: 0
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Modal states
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [showEditRestaurant, setShowEditRestaurant] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Form states
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerPassword: ''
  });
  const [customerPointsAdjustment, setCustomerPointsAdjustment] = useState({
    points: 0,
    reason: ''
  });

  useEffect(() => {
    fetchAllData();
    
    // Set up real-time subscriptions for support
    const ticketsSubscription = supabase
      .channel('support_tickets_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchSupportTickets();
      })
      .subscribe();

    const messagesSubscription = supabase
      .channel('support_messages_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        if (selectedTicket) {
          fetchTicketMessages(selectedTicket.id);
        }
      })
      .subscribe();

    return () => {
      ticketsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      
      // Fetch system-wide data (not restaurant-specific)
      const [restaurantsData, allCustomersData, allTransactionsData, supportData] = await Promise.all([
        fetchRestaurants(),
        fetchAllCustomers(),
        fetchAllTransactions(),
        fetchSupportTickets()
      ]);

      setRestaurants(restaurantsData);
      setCustomers(allCustomersData);
      setTransactions(allTransactionsData);
      setSupportTickets(supportData);
      
      // Calculate system-wide stats
      await fetchSystemStats();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAllData();
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Get all restaurants
      const { data: restaurantsData } = await supabase
        .from('restaurants')
        .select('id, created_at');

      // Get all customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('total_spent');

      // Get all transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('points, amount_spent, type');

      const totalRestaurants = restaurantsData?.length || 0;
      const activeRestaurants = totalRestaurants; // All restaurants are considered active
      const totalCustomers = customersData?.length || 0;
      const totalTransactions = transactionsData?.length || 0;
      const totalPointsIssued = transactionsData?.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0) || 0;
      const totalRevenue = customersData?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0;
      const totalRedemptions = transactionsData?.filter(t => t.type === 'redemption').length || 0;

      setSystemStats({
        totalRestaurants,
        activeRestaurants,
        totalCustomers,
        totalTransactions,
        totalPointsIssued,
        totalRevenue,
        totalRedemptions
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchRestaurants = async () => {
    try {
      console.log('🔍 Fetching all restaurants...');
      
      // Fetch restaurants without any joins to avoid schema cache errors
      const { data: restaurantsData, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching restaurants:', error);
        throw error;
      }

      console.log('✅ Restaurants fetched:', restaurantsData?.length || 0);
      
      // Fetch owner details separately for each restaurant
      const restaurantsWithOwners = await Promise.all(
        (restaurantsData || []).map(async (restaurant) => {
          try {
            // Get owner details from auth.users
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(restaurant.owner_id);
            
            if (userError) {
              console.warn(`⚠️ Could not fetch owner for restaurant ${restaurant.id}:`, userError);
              return {
                ...restaurant,
                owner_email: restaurant.owner_id || 'Unknown',
                owner_name: 'Unknown User'
              };
            }

            const user = userData.user;
            const firstName = user?.user_metadata?.first_name || '';
            const lastName = user?.user_metadata?.last_name || '';
            const ownerName = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'Unknown';

            // Get customer count
            const { data: customersData } = await supabase
              .from('customers')
              .select('id, total_spent')
              .eq('restaurant_id', restaurant.id);

            // Get transactions for points and redemptions
            const { data: transactionsData } = await supabase
              .from('transactions')
              .select('points, type, created_at')
              .eq('restaurant_id', restaurant.id);

            const customer_count = customersData?.length || 0;
            const total_revenue = customersData?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0;
            const points_issued = transactionsData?.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0) || 0;
            const redemptions = transactionsData?.filter(t => t.type === 'redemption').length || 0;
            const last_activity = transactionsData?.[0]?.created_at || restaurant.created_at;

            return {
              ...restaurant,
              owner_email: user?.email || 'Unknown',
              owner_name: ownerName,
              customer_count,
              total_revenue,
              points_issued,
              redemptions,
              last_activity
            };
          } catch (error) {
            console.error(`Error fetching data for restaurant ${restaurant.id}:`, error);
            return {
              ...restaurant,
              owner_email: 'Unknown',
              owner_name: 'Unknown',
              customer_count: 0,
              total_revenue: 0,
              points_issued: 0,
              redemptions: 0,
              last_activity: restaurant.created_at
            };
          }
        })
      );

      return restaurantsWithOwners;
    } catch (error: any) {
      console.error('❌ Error fetching restaurants:', error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
  };

  const fetchAllCustomers = async () => {
    try {
      console.log('🔍 Fetching all customers across all restaurants...');
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          restaurant:restaurants(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('✅ All customers fetched:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching all customers:', error);
      return [];
    }
  };

  const fetchAllTransactions = async () => {
    try {
      console.log('🔍 Fetching all transactions across all restaurants...');
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:customers(first_name, last_name),
          restaurant:restaurants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      console.log('✅ All transactions fetched:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching all transactions:', error);
      return [];
    }
  };

  const fetchSupportTickets = async () => {
    try {
      console.log('🔍 Fetching all support tickets...');
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          restaurant:restaurants(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('✅ Support tickets fetched:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching support tickets:', error);
      return [];
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSupportMessages(data || []);
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
    }
  };

  const handleCreateRestaurant = async () => {
    try {
      setLoading(true);
      
      console.log('🏗️ Creating new restaurant...');

      // Create user account
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: restaurantForm.ownerEmail,
        password: restaurantForm.ownerPassword,
        email_confirm: true,
        user_metadata: {
          first_name: restaurantForm.ownerFirstName,
          last_name: restaurantForm.ownerLastName,
          restaurant_name: restaurantForm.name
        }
      });

      if (userError) throw userError;

      // Create restaurant
      console.log('🏪 Creating restaurant record...');
      const slug = `${restaurantForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
      
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantForm.name,
          owner_id: userData.user.id,
          slug: slug,
          settings: {
            pointValueAED: 0.05,
            blanketMode: {
              enabled: true,
              type: 'manual',
              manualSettings: { pointsPerAED: 0.1 }
            },
            tierMultipliers: {
              bronze: 1.0,
              silver: 1.25,
              gold: 1.5,
              platinum: 2.0
            }
          }
        })
        .select()
        .single();

      if (restaurantError) throw restaurantError;

      // Create sample rewards
      console.log('🎁 Creating sample rewards...');
      const sampleRewards = [
        { name: 'Free Appetizer', description: 'Choose any appetizer from our menu', points_required: 100, category: 'food', min_tier: 'bronze' },
        { name: 'Free Dessert', description: 'Complimentary dessert of your choice', points_required: 150, category: 'food', min_tier: 'bronze' },
        { name: 'Free Drink', description: 'Any beverage from our drink menu', points_required: 75, category: 'beverage', min_tier: 'bronze' }
      ];

      await supabase
        .from('rewards')
        .insert(
          sampleRewards.map(reward => ({
            ...reward,
            restaurant_id: restaurantData.id
          }))
        );

      console.log('✅ Restaurant created successfully');
      setShowCreateRestaurant(false);
      setRestaurantForm({ name: '', ownerEmail: '', ownerFirstName: '', ownerLastName: '', ownerPassword: '' });
      await fetchAllData();
    } catch (error: any) {
      console.error('Error creating restaurant:', error);
      alert(error.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRestaurant = async () => {
    if (!editingRestaurant) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('restaurants')
        .update({
          name: restaurantForm.name,
          slug: restaurantForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        })
        .eq('id', editingRestaurant.id);

      if (error) throw error;

      setShowEditRestaurant(false);
      setEditingRestaurant(null);
      setRestaurantForm({ name: '', ownerEmail: '', ownerFirstName: '', ownerLastName: '', ownerPassword: '' });
      await fetchAllData();
    } catch (error: any) {
      console.error('Error updating restaurant:', error);
      alert(error.message || 'Failed to update restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string) => {
    if (!confirm('Are you sure you want to delete this restaurant? This will delete ALL associated data including customers, transactions, and rewards. This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('🗑️ Deleting restaurant:', restaurantId);

      // Delete in proper order to handle foreign key constraints
      await supabase.from('support_messages').delete().eq('ticket_id', 'in', 
        `(SELECT id FROM support_tickets WHERE restaurant_id = '${restaurantId}')`);
      await supabase.from('support_tickets').delete().eq('restaurant_id', restaurantId);
      await supabase.from('reward_redemptions').delete().eq('restaurant_id', restaurantId);
      await supabase.from('transactions').delete().eq('restaurant_id', restaurantId);
      await supabase.from('rewards').delete().eq('restaurant_id', restaurantId);
      await supabase.from('customers').delete().eq('restaurant_id', restaurantId);
      await supabase.from('menu_items').delete().eq('restaurant_id', restaurantId);
      await supabase.from('branches').delete().eq('restaurant_id', restaurantId);
      await supabase.from('restaurants').delete().eq('id', restaurantId);

      await fetchAllData();
      console.log('✅ Restaurant deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting restaurant:', error);
      alert(error.message || 'Failed to delete restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRestaurantData = async (restaurantId: string) => {
    if (!confirm('Are you sure you want to reset all data for this restaurant? This will delete all customers, transactions, and redemptions but keep the restaurant and rewards.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Resetting restaurant data:', restaurantId);

      // Delete customer-related data in proper order
      await supabase.from('support_messages').delete().eq('ticket_id', 'in', 
        `(SELECT id FROM support_tickets WHERE restaurant_id = '${restaurantId}')`);
      await supabase.from('support_tickets').delete().eq('restaurant_id', restaurantId);
      await supabase.from('reward_redemptions').delete().eq('restaurant_id', restaurantId);
      await supabase.from('transactions').delete().eq('restaurant_id', restaurantId);
      await supabase.from('customers').delete().eq('restaurant_id', restaurantId);

      // Reset reward redemption counts
      await supabase
        .from('rewards')
        .update({ total_redeemed: 0 })
        .eq('restaurant_id', restaurantId);

      await fetchAllData();
      console.log('✅ Restaurant data reset successfully');
    } catch (error: any) {
      console.error('❌ Error resetting restaurant data:', error);
      alert(error.message || 'Failed to reset restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemWideReset = async () => {
    if (!confirm('Are you sure you want to reset ALL data across the entire system? This will delete all customers, transactions, and redemptions for ALL restaurants. This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('🚨 Performing system-wide reset...');

      // Delete all data in proper order
      await supabase.from('support_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('support_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('reward_redemptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Reset all reward redemption counts
      await supabase
        .from('rewards')
        .update({ total_redeemed: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      await fetchAllData();
      console.log('✅ System-wide reset completed');
    } catch (error: any) {
      console.error('❌ Error resetting system data:', error);
      alert(error.message || 'Failed to reset system data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustCustomerPoints = async () => {
    if (!selectedCustomer) return;

    try {
      setLoading(true);

      const { error } = await supabase.rpc('process_point_transaction', {
        p_restaurant_id: selectedCustomer.restaurant_id,
        p_customer_id: selectedCustomer.id,
        p_type: customerPointsAdjustment.points > 0 ? 'bonus' : 'redemption',
        p_points: customerPointsAdjustment.points,
        p_description: `Admin adjustment: ${customerPointsAdjustment.reason}`,
        p_amount_spent: 0,
        p_reward_id: null,
        p_branch_id: null
      });

      if (error) throw error;

      setShowCustomerModal(false);
      setSelectedCustomer(null);
      setCustomerPointsAdjustment({ points: 0, reason: '' });
      await fetchAllCustomers();
    } catch (error: any) {
      console.error('Error adjusting customer points:', error);
      alert(error.message || 'Failed to adjust customer points');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSupportMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      setSendingMessage(true);

      await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_type: 'super_admin',
          sender_id: 'super-admin',
          message: newMessage
        });

      setNewMessage('');
      await fetchTicketMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await supabase
        .from('support_tickets')
        .update({ 
          status,
          assigned_to_admin: 'super-admin'
        })
        .eq('id', ticketId);

      await fetchSupportTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: status as any });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('super_admin_authenticated');
    localStorage.removeItem('super_admin_login_time');
    navigate('/super-admin-login');
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRestaurant = selectedRestaurant === 'all' || customer.restaurant_id === selectedRestaurant;
    return matchesSearch && matchesRestaurant;
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRestaurant = selectedRestaurant === 'all' || transaction.restaurant_id === selectedRestaurant;
    return matchesSearch && matchesRestaurant;
  });

  const openTickets = supportTickets.filter(ticket => ticket.status === 'open').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-500">System-wide oversight and management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">System Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'restaurants', label: 'Restaurants', icon: Building },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'transactions', label: 'Transactions', icon: Activity },
              { id: 'support', label: `Support ${openTickets > 0 ? `(${openTickets})` : ''}`, icon: MessageSquare },
              { id: 'system', label: 'System', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Restaurants</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalRestaurants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalCustomers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Points Issued</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalPointsIssued.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalRevenue.toFixed(0)} AED</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Database</p>
                    <p className="text-sm text-green-700">Connected</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Auth Service</p>
                    <p className="text-sm text-green-700">Operational</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Point Engine</p>
                    <p className="text-sm text-green-700">Running</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Support System</p>
                    <p className="text-sm text-green-700">Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {transactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.customer?.first_name} {transaction.customer?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {transaction.restaurant?.name} • {transaction.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Restaurant Management</h2>
              <button
                onClick={() => setShowCreateRestaurant(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Restaurant
              </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Restaurants List */}
            <div className="space-y-4">
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                          <p className="text-sm text-gray-600">
                            Owner: {restaurant.owner_name} ({restaurant.owner_email})
                          </p>
                          <p className="text-xs text-gray-500">ID: {restaurant.id}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRestaurant(restaurant);
                            setRestaurantForm({ ...restaurantForm, name: restaurant.name });
                            setShowEditRestaurant(true);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteRestaurant(restaurant.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setExpandedRestaurant(
                            expandedRestaurant === restaurant.id ? null : restaurant.id
                          )}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {expandedRestaurant === restaurant.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Restaurant Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Customers</p>
                        <p className="text-lg font-bold text-gray-900">{restaurant.customer_count}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Revenue</p>
                        <p className="text-lg font-bold text-gray-900">{restaurant.total_revenue?.toFixed(0)} AED</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Points</p>
                        <p className="text-lg font-bold text-gray-900">{restaurant.points_issued?.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Redemptions</p>
                        <p className="text-lg font-bold text-gray-900">{restaurant.redemptions}</p>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedRestaurant === restaurant.id && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Loyalty Settings */}
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-3">Loyalty Settings</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-blue-700">Point Value:</span>
                                <span className="font-medium text-blue-900">
                                  {restaurant.settings?.pointValueAED || 0.05} AED
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Blanket Mode:</span>
                                <span className="font-medium text-blue-900">
                                  {restaurant.settings?.blanketMode?.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              {restaurant.settings?.blanketMode?.enabled && (
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Mode Type:</span>
                                  <span className="font-medium text-blue-900">
                                    {restaurant.settings.blanketMode.type}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="space-y-3">
                            <button
                              onClick={() => handleResetRestaurantData(restaurant.id)}
                              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Reset Restaurant Data
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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
              <h2 className="text-xl font-bold text-gray-900">Customer Management</h2>
              <div className="flex items-center gap-3">
                <select
                  value={selectedRestaurant}
                  onChange={(e) => setSelectedRestaurant(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Restaurants</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Customers List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Restaurant</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Points</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Tier</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Spent</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{customer.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">{customer.restaurant?.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{customer.total_points}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {customer.current_tier}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">{customer.total_spent.toFixed(0)} AED</p>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowCustomerModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Adjust Points
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Transaction Monitoring</h2>
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Restaurants</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Restaurant</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Points</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">
                            {transaction.customer?.first_name} {transaction.customer?.last_name}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">{transaction.restaurant?.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            transaction.type === 'purchase' ? 'bg-green-100 text-green-800' :
                            transaction.type === 'redemption' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className={`font-medium ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">
                            {transaction.amount_spent ? `${transaction.amount_spent} AED` : '-'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-600">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
            {/* Tickets Sidebar */}
            <div className="bg-white border border-gray-200 rounded-xl flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Support Tickets</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {supportTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      selectedTicket?.id === ticket.id ? 'bg-red-50 border-r-2 border-red-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {ticket.title}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                        ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {ticket.restaurant?.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl flex flex-col">
              {selectedTicket ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedTicket.title}</h3>
                        <p className="text-sm text-gray-600">{selectedTicket.restaurant?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                          className="px-3 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Initial ticket message */}
                    <div className="flex justify-start">
                      <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-900">
                        <p className="text-sm">{selectedTicket.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(selectedTicket.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {supportMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'super_admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_type === 'super_admin'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_type === 'super_admin' ? 'text-red-200' : 'text-gray-500'
                          }`}>
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !sendingMessage && handleSendSupportMessage()}
                        placeholder="Type your response..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendSupportMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Ticket</h3>
                    <p className="text-gray-500">Choose a support ticket to view the conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">System Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data Management */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh All Data
                  </button>
                  
                  <button
                    onClick={handleSystemWideReset}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset All Customer Data
                  </button>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Version:</span>
                    <span className="font-medium text-gray-900">2.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Environment:</span>
                    <span className="font-medium text-gray-900">Production</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Database:</span>
                    <span className="font-medium text-green-600">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Backup:</span>
                    <span className="font-medium text-gray-900">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Restaurant Modal */}
      {showCreateRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Create Restaurant Account</h3>
              <button
                onClick={() => setShowCreateRestaurant(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={restaurantForm.name}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter restaurant name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner First Name
                  </label>
                  <input
                    type="text"
                    value={restaurantForm.ownerFirstName}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, ownerFirstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Last Name
                  </label>
                  <input
                    type="text"
                    value={restaurantForm.ownerLastName}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, ownerLastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Email
                </label>
                <input
                  type="email"
                  value={restaurantForm.ownerEmail}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, ownerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="owner@restaurant.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Password
                </label>
                <input
                  type="password"
                  value={restaurantForm.ownerPassword}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, ownerPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateRestaurant(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRestaurant}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Restaurant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Restaurant Modal */}
      {showEditRestaurant && editingRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Edit Restaurant</h3>
              <button
                onClick={() => setShowEditRestaurant(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={restaurantForm.name}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter restaurant name"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>Owner:</strong> {editingRestaurant.owner_name} ({editingRestaurant.owner_email})
                </p>
                <p className="text-sm text-gray-600">
                  <strong>ID:</strong> {editingRestaurant.id}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditRestaurant(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRestaurant}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Update Restaurant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Points Adjustment Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Adjust Customer Points</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </p>
                <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                <p className="text-sm text-gray-600">
                  Current Points: {selectedCustomer.total_points}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points Adjustment
                </label>
                <input
                  type="number"
                  value={customerPointsAdjustment.points}
                  onChange={(e) => setCustomerPointsAdjustment({ 
                    ...customerPointsAdjustment, 
                    points: parseInt(e.target.value) || 0 
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter points (positive to add, negative to subtract)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={customerPointsAdjustment.reason}
                  onChange={(e) => setCustomerPointsAdjustment({ 
                    ...customerPointsAdjustment, 
                    reason: e.target.value 
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Reason for adjustment"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustCustomerPoints}
                disabled={loading || !customerPointsAdjustment.reason.trim()}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Adjust Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUI;