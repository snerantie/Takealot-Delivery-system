import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

const formatLabel = (p: PhotonFeature['properties']): string => {
  const parts: string[] = [];
  if (p.name) parts.push(p.name);
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  if (street && street !== p.name) parts.push(street);
  if (p.city) parts.push(p.city);
  if (p.state && p.state !== p.city) parts.push(p.state);
  if (p.country) parts.push(p.country);
  return parts.join(', ');
};


/**
 * Address autocomplete using Photon (free, no API key, OpenStreetMap data).
 * Results are biased toward South Africa for better local matches.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value (e.g. when react-hook-form resets)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        // Bias toward Johannesburg/Pretoria; results still cover all SA
        const url =
          'https://photon.komoot.io/api/?q=' +
          encodeURIComponent(query) +
          '&lat=-26.2041&lon=28.0473&limit=5&lang=en';
        const res = await fetch(url);
        if (!res.ok) throw new Error('autocomplete failed');
        const data = (await res.json()) as { features: PhotonFeature[] };
        const out: AddressSuggestion[] = (data.features || []).map((f) => ({
          label: formatLabel(f.properties),
          lng: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
        }));
        setSuggestions(out);
        setOpen(out.length > 0);
        setHighlighted(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);


  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const choose = (s: AddressSuggestion) => {
    setQuery(s.label);
    onChange(s.label);
    onSelect(s);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      choose(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <Loader2
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
        />
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat}-${s.lng}-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex items-start gap-2 px-3 py-2 text-sm cursor-pointer ${
                highlighted === i ? 'bg-primary-50' : 'hover:bg-gray-50'
              }`}
            >
              <MapPin size={14} className="text-primary-600 mt-0.5 shrink-0" />
              <span className="text-gray-900">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
