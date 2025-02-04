'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import CarCard from '../../components/CarCard';
import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Car, Brand } from '../../types/supabase';

interface ExtendedCar extends Omit<Car, 'brand_id' | 'model_id'> {
  brand: Brand;
  model: {
    id: number;
    name: string;
  };
  images: {
    id: number;
    url: string;
  }[];
}

interface Filters {
  brand_id?: number;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  condition?: string;
  fuel_type?: string;
  body_type?: string;
  gearbox_type?: string;
}

export default function CarsPage() {
  const [cars, setCars] = useState<ExtendedCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [brands, setBrands] = useState<Brand[]>([]);
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Fetch brands
  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching brands:', error);
        return;
      }
      
      setBrands(data || []);
    };

    fetchBrands();
  }, []);

  // Fetch cars with filters
  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('cars')
          .select(`
            *,
            brand:brands(*),
            model:models(id, name),
            images:car_images(id, url)
          `)
          .eq('status', 'Approved');

        // Apply filters
        if (filters.brand_id) {
          query = query.eq('brand_id', filters.brand_id);
        }
        if (filters.minPrice) {
          query = query.gte('price', filters.minPrice);
        }
        if (filters.maxPrice) {
          query = query.lte('price', filters.maxPrice);
        }
        if (filters.minYear) {
          query = query.gte('year', filters.minYear);
        }
        if (filters.maxYear) {
          query = query.lte('year', filters.maxYear);
        }
        if (filters.condition) {
          query = query.eq('condition', filters.condition);
        }
        if (filters.fuel_type) {
          query = query.eq('fuel_type', filters.fuel_type);
        }
        if (filters.body_type) {
          query = query.eq('body_type', filters.body_type);
        }
        if (filters.gearbox_type) {
          query = query.eq('gearbox_type', filters.gearbox_type);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Apply search filter on the client side
        let filteredCars = data || [];
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          filteredCars = filteredCars.filter(car =>
            car.brand.name.toLowerCase().includes(search) ||
            car.model.name.toLowerCase().includes(search) ||
            car.description?.toLowerCase().includes(search)
          );
        }

        setCars(filteredCars);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching cars:', error);
        setError('Unable to load cars at the moment.');
      } finally {
        setLoading(false);
      }
    };

    fetchCars();
  }, [filters, searchTerm]);

  // Fetch user's favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('car_id')
          .eq('user_id', user.id);

        if (error) throw error;

        setFavorites(new Set(data.map(fav => fav.car_id)));
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };

    fetchFavorites();
  }, [user]);

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleFavoriteChange = (carId: number, isFavorited: boolean) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (isFavorited) {
        newFavorites.add(carId);
      } else {
        newFavorites.delete(carId);
      }
      return newFavorites;
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Available Cars
        </h1>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search cars..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-qatar-maroon focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FunnelIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Brand
              </label>
              <select
                value={filters.brand_id || ''}
                onChange={(e) => handleFilterChange({ brand_id: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Brands</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) => handleFilterChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => handleFilterChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minYear || ''}
                  onChange={(e) => handleFilterChange({ minYear: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxYear || ''}
                  onChange={(e) => handleFilterChange({ maxYear: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Condition
              </label>
              <select
                value={filters.condition || ''}
                onChange={(e) => handleFilterChange({ condition: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Conditions</option>
                <option value="New">New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Not Working">Not Working</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fuel Type
              </label>
              <select
                value={filters.fuel_type || ''}
                onChange={(e) => handleFilterChange({ fuel_type: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Fuel Types</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Body Type
              </label>
              <select
                value={filters.body_type || ''}
                onChange={(e) => handleFilterChange({ body_type: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Body Types</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Coupe">Coupe</option>
                <option value="Truck">Truck</option>
                <option value="Van">Van</option>
                <option value="Wagon">Wagon</option>
                <option value="Convertible">Convertible</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transmission
              </label>
              <select
                value={filters.gearbox_type || ''}
                onChange={(e) => handleFilterChange({ gearbox_type: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Transmissions</option>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-qatar-maroon border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        </div>
      ) : cars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              isFavorited={favorites.has(car.id)}
              onFavoriteChange={handleFavoriteChange}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No cars found matching your criteria.
        </div>
      )}
    </div>
  );
}
