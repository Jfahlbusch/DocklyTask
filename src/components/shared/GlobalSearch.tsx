'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ClipboardList,
  Target,
  Building2,
  Package,
  Tags,
  Users,
  User,
  FileText,
  Loader2,
  X,
} from 'lucide-react';

interface SearchResult {
  type: 'task' | 'project' | 'customer' | 'product' | 'category' | 'team' | 'user' | 'template';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  statusColor?: string;
  color?: string;
  avatar?: string;
  href: string;
  icon: string;
}

interface SearchResponse {
  results: SearchResult[];
  counts: {
    tasks: number;
    projects: number;
    customers: number;
    products: number;
    categories: number;
    teams: number;
    users: number;
    templates: number;
  };
}

const typeLabels: Record<SearchResult['type'], string> = {
  task: 'Aufgaben',
  project: 'Projekte',
  customer: 'Kunden',
  product: 'Produkte',
  category: 'Kategorien',
  team: 'Teams',
  user: 'Benutzer',
  template: 'Vorlagen',
};

const typeIcons: Record<SearchResult['type'], React.ReactNode> = {
  task: <ClipboardList className="h-4 w-4" />,
  project: <Target className="h-4 w-4" />,
  customer: <Building2 className="h-4 w-4" />,
  product: <Package className="h-4 w-4" />,
  category: <Tags className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  template: <FileText className="h-4 w-4" />,
};

interface GlobalSearchProps {
  className?: string;
}

export default function GlobalSearch({ className }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut to focus search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    // Open dropdown when user starts typing
    if (query.length > 0) {
      setIsOpen(true);
    }
    
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data: SearchResponse = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = useCallback(
    (href: string) => {
      setIsOpen(false);
      setQuery('');
      setResults([]);
      router.push(href);
    },
    [router]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex].href);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchResult['type'], SearchResult[]>);

  // Flatten for index-based selection
  const flatResults = Object.values(groupedResults).flat();

  return (
    <div ref={containerRef} className={`relative w-full max-w-[80%] mx-auto ${className || ''}`}>
      {/* Search Input - Integrated in Header */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Suche nach Aufgaben, Projekten, Kunden..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          className="
            w-full h-10 pl-11 pr-20
            bg-gray-50 hover:bg-gray-100 focus:bg-white
            border border-gray-200 focus:border-blue-400
            rounded-full
            text-sm text-gray-900 placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
            transition-all duration-200
            shadow-sm hover:shadow focus:shadow-md
          "
        />
        
        {/* Right side elements */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          
          {query && !loading && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
          
          {!query && (
            <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 text-[10px] text-gray-400 bg-white border border-gray-200 rounded-full">
              <span>⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            {/* Initial state - no query */}
            {!query && (
              <div className="px-4 py-6 text-center text-gray-500">
                <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium">Suche starten</p>
                <p className="text-xs text-gray-400 mt-1">
                  Mindestens 2 Zeichen eingeben
                </p>
              </div>
            )}

            {/* Query too short */}
            {query && query.length < 2 && (
              <div className="px-4 py-6 text-center text-gray-500">
                <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium">Mindestens 2 Zeichen eingeben</p>
              </div>
            )}

            {/* No results */}
            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500">
                <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium">Keine Ergebnisse für &quot;{query}&quot;</p>
                <p className="text-xs text-gray-400 mt-1">
                  Versuche einen anderen Suchbegriff
                </p>
              </div>
            )}

            {/* Results */}
            {!loading && Object.entries(groupedResults).map(([type, items]) => {
              const startIndex = flatResults.findIndex(
                (r) => r.type === type && r.id === items[0].id
              );
              return (
                <div key={type} className="py-1">
                  <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {typeLabels[type as SearchResult['type']]}
                  </div>
                  {items.map((result, idx) => {
                    const globalIndex = startIndex + idx;
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result.href)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`
                          w-full px-4 py-2 flex items-center gap-3 text-left transition-colors
                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                        `}
                      >
                        {/* Icon or Avatar - Rounded */}
                        {result.type === 'user' && result.avatar ? (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={result.avatar} />
                            <AvatarFallback>
                              {result.title?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div
                            className={`
                              flex items-center justify-center w-8 h-8 rounded-full shrink-0
                              ${result.type === 'task' ? 'bg-blue-100 text-blue-600' : ''}
                              ${result.type === 'project' ? 'bg-purple-100 text-purple-600' : ''}
                              ${result.type === 'customer' ? 'bg-green-100 text-green-600' : ''}
                              ${result.type === 'product' ? 'bg-orange-100 text-orange-600' : ''}
                              ${result.type === 'category' ? 'bg-yellow-100 text-yellow-600' : ''}
                              ${result.type === 'team' ? 'bg-cyan-100 text-cyan-600' : ''}
                              ${result.type === 'user' ? 'bg-pink-100 text-pink-600' : ''}
                              ${result.type === 'template' ? 'bg-indigo-100 text-indigo-600' : ''}
                            `}
                          >
                            {typeIcons[result.type]}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-gray-400 truncate">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                          {result.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {result.description}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        {result.status && (
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                            style={
                              result.statusColor
                                ? {
                                    backgroundColor: `${result.statusColor}20`,
                                    color: result.statusColor,
                                  }
                                : undefined
                            }
                          >
                            {result.status}
                          </Badge>
                        )}

                        {/* Category Color */}
                        {result.color && (
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: result.color }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer with keyboard hints */}
          {(query.length >= 2 || results.length > 0) && (
            <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400 bg-gray-50">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↵</kbd>
                auswählen
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↑↓</kbd>
                navigieren
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">Esc</kbd>
                schließen
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
