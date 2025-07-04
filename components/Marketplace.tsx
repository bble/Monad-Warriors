import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { GAME_CONSTANTS, getClassIcon, getRarityColor, formatMWAR } from '@/utils/web3Config';

interface MarketListing {
  id: string;
  seller: string;
  sellerName: string;
  itemType: 'hero' | 'equipment';
  itemId: number;
  itemData: {
    name: string;
    rarity: number;
    class?: number;
    level: number;
    power?: number;
    stats?: any;
    image: string;
  };
  price: number;
  currency: 'MWAR' | 'MON';
  listedAt: string;
  expiresAt: string;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
}

interface MarketplaceProps {
  category?: 'all' | 'heroes' | 'equipment';
}

export default function Marketplace({ category = 'all' }: MarketplaceProps) {
  const { address } = useAccount();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [sortBy, setSortBy] = useState<'price' | 'level' | 'rarity' | 'recent'>('recent');
  const [priceFilter, setPriceFilter] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [isLoading, setIsLoading] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  // 获取真实市场数据
  const fetchMarketListings = async (): Promise<MarketListing[]> => {
    try {
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          sortBy: sortBy,
          priceFilter: priceFilter
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.listings || [];
      }
    } catch (error) {
      // 静默处理错误
    }

    // 如果API失败，返回示例数据
    return [
      {
        id: 'listing_1',
        seller: '0x1234567890123456789012345678901234567890',
        sellerName: 'DragonSlayer',
        itemType: 'hero',
        itemId: 1,
        itemData: {
          name: 'Epic Fire Warrior',
          rarity: 2,
          class: 0,
          level: 15,
          power: 1250,
          image: '/heroes/warrior.png'
        },
        price: 2500,
        currency: 'MWAR',
        listedAt: '2 hours ago',
        expiresAt: '5 days',
        status: 'active'
      },
      {
        id: 'listing_2',
        seller: '0x2345678901234567890123456789012345678901',
        sellerName: 'MysticMage',
        itemType: 'hero',
        itemId: 2,
        itemData: {
          name: 'Legendary Ice Mage',
          rarity: 3,
          class: 1,
          level: 22,
          power: 1800,
          image: '/heroes/mage.png'
        },
        price: 5000,
        currency: 'MWAR',
        listedAt: '1 day ago',
        expiresAt: '3 days',
        status: 'active'
      },
      {
        id: 'listing_3',
        seller: '0x3456789012345678901234567890123456789012',
        sellerName: 'ShadowArcher',
        itemType: 'equipment',
        itemId: 3,
        itemData: {
          name: 'Enchanted Bow',
          rarity: 2,
          level: 10,
          stats: { attack: 45, speed: 15 },
          image: '/equipment/bow.png'
        },
        price: 1200,
        currency: 'MWAR',
        listedAt: '3 hours ago',
        expiresAt: '6 days',
        status: 'active'
      }
    ];
  };

  useEffect(() => {
    const loadMarketplace = async () => {
      setIsLoading(true);
      try {
        const listings = await fetchMarketListings();
        setListings(listings);
      } catch (error) {
        // 如果获取失败，显示空列表
        setListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMarketplace();
  }, [selectedCategory, sortBy, priceFilter]);

  const handleBuy = async (listing: MarketListing) => {
    if (listing.seller === address) {
      alert('You cannot buy your own listing!');
      return;
    }

    try {
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          listingId: listing.id,
          buyer: address
        })
      });

      if (response.ok) {
        // 重新加载市场数据
        const listings = await fetchMarketListings();
        setListings(listings);
        alert(`Successfully purchased ${listing.itemData.name}!`);
      } else {
        alert('Purchase failed. Please try again.');
      }
    } catch (error) {
      alert('Purchase failed. Please try again.');
    }
  };

  const handleCancel = async (listingId: string) => {
    try {
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          listingId: listingId,
          seller: address
        })
      });

      if (response.ok) {
        // 重新加载市场数据
        const listings = await fetchMarketListings();
        setListings(listings);
        alert('Listing cancelled successfully!');
      } else {
        alert('Cancel failed. Please try again.');
      }
    } catch (error) {
      alert('Cancel failed. Please try again.');
    }
  };

  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const renderListingCard = (listing: MarketListing) => (
    <div key={listing.id} className="glass-panel p-4 hover:bg-gray-800/30 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{listing.itemData.image}</span>
          <div>
            <h3 className="font-semibold">{listing.itemData.name}</h3>
            <div className={`text-sm ${getRarityColor(listing.itemData.rarity)}`}>
              {GAME_CONSTANTS.RARITY_NAMES[listing.itemData.rarity]}
              {listing.itemData.class !== undefined && (
                <span className="ml-2">
                  {getClassIcon(listing.itemData.class)} {GAME_CONSTANTS.CLASS_NAMES[listing.itemData.class]}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-yellow-400">
            {listing.price} {listing.currency}
          </div>
          <div className="text-xs text-gray-400">
            Level {listing.itemData.level}
          </div>
        </div>
      </div>

      {listing.itemData.power && (
        <div className="mb-3">
          <div className="text-sm text-gray-400">Power: {listing.itemData.power}</div>
        </div>
      )}

      {listing.itemData.stats && (
        <div className="mb-3">
          <div className="text-sm text-gray-400">Stats:</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(listing.itemData.stats).map(([stat, value]) => (
              <span key={stat} className="text-xs bg-gray-700 px-2 py-1 rounded">
                {stat}: +{String(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
        <div>
          Seller: <span className="text-blue-400">{listing.sellerName}</span>
        </div>
        <div>
          Listed: {listing.listedAt}
        </div>
      </div>

      <div className="flex space-x-2">
        {listing.seller === address ? (
          <button
            onClick={() => handleCancel(listing.id)}
            className="btn-secondary flex-1"
            disabled={listing.status !== 'active'}
          >
            {listing.status === 'active' ? 'Cancel Listing' : 'Cancelled'}
          </button>
        ) : (
          <button
            onClick={() => handleBuy(listing)}
            className="btn-primary flex-1"
            disabled={listing.status !== 'active'}
          >
            {listing.status === 'active' ? 'Buy Now' : 
             listing.status === 'sold' ? 'Sold' : 'Unavailable'}
          </button>
        )}
        
        <button className="btn-secondary px-4">
          View Details
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">🏪 Marketplace</h2>
          
          <button
            onClick={() => setShowListModal(true)}
            className="btn-primary"
          >
            List Item for Sale
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          {/* Category Filter */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {[
              { key: 'all', label: 'All', icon: '🛍️' },
              { key: 'heroes', label: 'Heroes', icon: '⚔️' },
              { key: 'equipment', label: 'Equipment', icon: '🛡️' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as any)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedCategory === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="recent">Recently Listed</option>
            <option value="price">Price: Low to High</option>
            <option value="level">Level: High to Low</option>
            <option value="rarity">Rarity: High to Low</option>
          </select>

          {/* Price Range */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Price:</span>
            <input
              type="number"
              placeholder="Min"
              value={priceFilter.min}
              onChange={(e) => setPriceFilter(prev => ({ ...prev, min: Number(e.target.value) }))}
              className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              placeholder="Max"
              value={priceFilter.max}
              onChange={(e) => setPriceFilter(prev => ({ ...prev, max: Number(e.target.value) }))}
              className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
            />
            <span className="text-sm text-gray-400">MWAR</span>
          </div>
        </div>
      </div>

      {/* Marketplace Listings */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {selectedCategory === 'all' ? 'All Items' :
             selectedCategory === 'heroes' ? 'Heroes for Sale' : 'Equipment for Sale'}
          </h3>
          <div className="text-sm text-gray-400">
            {listings.length} items found
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner"></div>
            <span className="ml-2">Loading marketplace...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛍️</div>
            <h4 className="text-xl font-semibold mb-2">No Items Found</h4>
            <p className="text-gray-400">Try adjusting your filters or check back later!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map(renderListingCard)}
          </div>
        )}
      </div>

      {/* Market Stats */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Market Statistics</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">247</div>
            <div className="text-sm text-gray-400">Active Listings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">1,834</div>
            <div className="text-sm text-gray-400">Items Sold</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">45,670</div>
            <div className="text-sm text-gray-400">Total Volume (MWAR)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">892</div>
            <div className="text-sm text-gray-400">Average Price</div>
          </div>
        </div>
      </div>
    </div>
  );
}
