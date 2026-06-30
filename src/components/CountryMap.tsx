/**
 * CountryMap — interactive world map for the Travel Map quest template.
 *
 * Tap once → want to go · tap again → visited · tap again → remove.
 * Long-press a visited country to open its photo gallery.
 * Renders a Mercator dot map and continent chip grid.
 */

import React, { useMemo, useState } from 'react';
import { Image, Modal, Platform, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Eyebrow, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { newId } from '@/db/store';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';
import type { CountryPin, MediaPayload } from '@/db/types';

interface CountryData {
  iso: string;
  name: string;
  lat: number;
  lng: number;
  continent: string;
}

// ~175 countries with centroid lat/lng for Mercator projection
const COUNTRIES: CountryData[] = [
  // ── Europe ──────────────────────────────────────────────────────────────
  { iso: 'FR', name: 'France',          lat:  46.2, lng:   2.2, continent: 'Europe' },
  { iso: 'IT', name: 'Italy',           lat:  42.8, lng:  12.8, continent: 'Europe' },
  { iso: 'ES', name: 'Spain',           lat:  40.5, lng:  -3.7, continent: 'Europe' },
  { iso: 'PT', name: 'Portugal',        lat:  39.4, lng:  -8.2, continent: 'Europe' },
  { iso: 'GB', name: 'UK',              lat:  54.4, lng:  -2.0, continent: 'Europe' },
  { iso: 'DE', name: 'Germany',         lat:  51.2, lng:  10.5, continent: 'Europe' },
  { iso: 'GR', name: 'Greece',          lat:  39.1, lng:  21.8, continent: 'Europe' },
  { iso: 'NL', name: 'Netherlands',     lat:  52.3, lng:   5.3, continent: 'Europe' },
  { iso: 'CH', name: 'Switzerland',     lat:  46.8, lng:   8.2, continent: 'Europe' },
  { iso: 'NO', name: 'Norway',          lat:  60.5, lng:   8.5, continent: 'Europe' },
  { iso: 'SE', name: 'Sweden',          lat:  60.1, lng:  18.6, continent: 'Europe' },
  { iso: 'DK', name: 'Denmark',         lat:  56.3, lng:   9.5, continent: 'Europe' },
  { iso: 'IS', name: 'Iceland',         lat:  64.9, lng: -18.5, continent: 'Europe' },
  { iso: 'PL', name: 'Poland',          lat:  51.9, lng:  19.1, continent: 'Europe' },
  { iso: 'AT', name: 'Austria',         lat:  47.5, lng:  14.6, continent: 'Europe' },
  { iso: 'HR', name: 'Croatia',         lat:  45.1, lng:  15.2, continent: 'Europe' },
  { iso: 'CZ', name: 'Czech Rep.',      lat:  49.8, lng:  15.5, continent: 'Europe' },
  { iso: 'HU', name: 'Hungary',         lat:  47.1, lng:  19.5, continent: 'Europe' },
  { iso: 'IE', name: 'Ireland',         lat:  53.4, lng:  -8.2, continent: 'Europe' },
  { iso: 'BE', name: 'Belgium',         lat:  50.5, lng:   4.5, continent: 'Europe' },
  { iso: 'RO', name: 'Romania',         lat:  45.9, lng:  24.9, continent: 'Europe' },
  { iso: 'FI', name: 'Finland',         lat:  61.9, lng:  25.7, continent: 'Europe' },
  { iso: 'SK', name: 'Slovakia',        lat:  48.7, lng:  19.7, continent: 'Europe' },
  { iso: 'SI', name: 'Slovenia',        lat:  46.1, lng:  14.9, continent: 'Europe' },
  { iso: 'BG', name: 'Bulgaria',        lat:  42.7, lng:  25.5, continent: 'Europe' },
  { iso: 'RS', name: 'Serbia',          lat:  44.0, lng:  21.0, continent: 'Europe' },
  { iso: 'LT', name: 'Lithuania',       lat:  55.2, lng:  23.9, continent: 'Europe' },
  { iso: 'LV', name: 'Latvia',          lat:  56.9, lng:  24.6, continent: 'Europe' },
  { iso: 'EE', name: 'Estonia',         lat:  58.6, lng:  25.0, continent: 'Europe' },
  { iso: 'LU', name: 'Luxembourg',      lat:  49.8, lng:   6.1, continent: 'Europe' },
  { iso: 'MT', name: 'Malta',           lat:  35.9, lng:  14.5, continent: 'Europe' },
  { iso: 'CY', name: 'Cyprus',          lat:  35.1, lng:  33.4, continent: 'Europe' },
  { iso: 'AL', name: 'Albania',         lat:  41.2, lng:  20.2, continent: 'Europe' },
  { iso: 'MK', name: 'N. Macedonia',    lat:  41.6, lng:  21.7, continent: 'Europe' },
  { iso: 'BA', name: 'Bosnia',          lat:  43.9, lng:  17.7, continent: 'Europe' },
  { iso: 'ME', name: 'Montenegro',      lat:  42.7, lng:  19.4, continent: 'Europe' },
  { iso: 'MD', name: 'Moldova',         lat:  47.4, lng:  28.4, continent: 'Europe' },
  { iso: 'BY', name: 'Belarus',         lat:  53.7, lng:  27.9, continent: 'Europe' },
  { iso: 'UA', name: 'Ukraine',         lat:  49.0, lng:  31.4, continent: 'Europe' },
  { iso: 'TR', name: 'Turkey',          lat:  38.9, lng:  35.2, continent: 'Europe' },
  { iso: 'GE', name: 'Georgia',         lat:  42.3, lng:  43.4, continent: 'Europe' },
  { iso: 'AM', name: 'Armenia',         lat:  40.1, lng:  45.0, continent: 'Europe' },

  // ── Americas ─────────────────────────────────────────────────────────────
  { iso: 'US', name: 'USA',             lat:  37.1, lng: -95.7, continent: 'Americas' },
  { iso: 'CA', name: 'Canada',          lat:  56.1, lng:-106.3, continent: 'Americas' },
  { iso: 'MX', name: 'Mexico',          lat:  23.6, lng:-102.5, continent: 'Americas' },
  { iso: 'BR', name: 'Brazil',          lat: -14.2, lng: -51.9, continent: 'Americas' },
  { iso: 'AR', name: 'Argentina',       lat: -38.4, lng: -63.6, continent: 'Americas' },
  { iso: 'CO', name: 'Colombia',        lat:   4.6, lng: -74.3, continent: 'Americas' },
  { iso: 'PE', name: 'Peru',            lat:  -9.2, lng: -75.0, continent: 'Americas' },
  { iso: 'CL', name: 'Chile',           lat: -35.7, lng: -71.5, continent: 'Americas' },
  { iso: 'CR', name: 'Costa Rica',      lat:   9.7, lng: -83.8, continent: 'Americas' },
  { iso: 'CU', name: 'Cuba',            lat:  21.5, lng: -79.5, continent: 'Americas' },
  { iso: 'EC', name: 'Ecuador',         lat:  -1.8, lng: -78.2, continent: 'Americas' },
  { iso: 'UY', name: 'Uruguay',         lat: -32.5, lng: -55.8, continent: 'Americas' },
  { iso: 'PA', name: 'Panama',          lat:   8.5, lng: -80.8, continent: 'Americas' },
  { iso: 'BO', name: 'Bolivia',         lat: -16.3, lng: -63.6, continent: 'Americas' },
  { iso: 'VE', name: 'Venezuela',       lat:   6.4, lng: -66.6, continent: 'Americas' },
  { iso: 'DO', name: 'Dom. Republic',   lat:  18.7, lng: -70.2, continent: 'Americas' },
  { iso: 'GT', name: 'Guatemala',       lat:  15.8, lng: -90.2, continent: 'Americas' },
  { iso: 'HN', name: 'Honduras',        lat:  15.2, lng: -86.2, continent: 'Americas' },
  { iso: 'SV', name: 'El Salvador',     lat:  13.8, lng: -88.9, continent: 'Americas' },
  { iso: 'NI', name: 'Nicaragua',       lat:  12.9, lng: -85.2, continent: 'Americas' },
  { iso: 'HT', name: 'Haiti',           lat:  18.9, lng: -72.7, continent: 'Americas' },
  { iso: 'JM', name: 'Jamaica',         lat:  18.1, lng: -77.3, continent: 'Americas' },
  { iso: 'TT', name: 'Trinidad',        lat:  10.7, lng: -61.2, continent: 'Americas' },
  { iso: 'BZ', name: 'Belize',          lat:  17.2, lng: -88.5, continent: 'Americas' },
  { iso: 'GY', name: 'Guyana',          lat:   4.9, lng: -59.0, continent: 'Americas' },
  { iso: 'SR', name: 'Suriname',        lat:   3.9, lng: -56.0, continent: 'Americas' },
  { iso: 'PY', name: 'Paraguay',        lat: -23.4, lng: -58.4, continent: 'Americas' },
  { iso: 'BB', name: 'Barbados',        lat:  13.2, lng: -59.6, continent: 'Americas' },
  { iso: 'BS', name: 'Bahamas',         lat:  24.3, lng: -77.5, continent: 'Americas' },
  { iso: 'GD', name: 'Grenada',         lat:  12.1, lng: -61.7, continent: 'Americas' },
  { iso: 'LC', name: 'Saint Lucia',     lat:  13.9, lng: -60.9, continent: 'Americas' },
  { iso: 'VC', name: 'St. Vincent',     lat:  13.3, lng: -61.2, continent: 'Americas' },
  { iso: 'AG', name: 'Antigua',         lat:  17.1, lng: -61.8, continent: 'Americas' },

  // ── Asia ─────────────────────────────────────────────────────────────────
  { iso: 'JP', name: 'Japan',           lat:  36.2, lng: 138.3, continent: 'Asia' },
  { iso: 'CN', name: 'China',           lat:  35.9, lng: 104.2, continent: 'Asia' },
  { iso: 'IN', name: 'India',           lat:  20.6, lng:  78.9, continent: 'Asia' },
  { iso: 'KR', name: 'South Korea',     lat:  35.9, lng: 127.8, continent: 'Asia' },
  { iso: 'TH', name: 'Thailand',        lat:  15.9, lng: 100.9, continent: 'Asia' },
  { iso: 'VN', name: 'Vietnam',         lat:  14.1, lng: 108.3, continent: 'Asia' },
  { iso: 'ID', name: 'Indonesia',       lat:  -0.8, lng: 113.9, continent: 'Asia' },
  { iso: 'MY', name: 'Malaysia',        lat:   4.2, lng: 108.0, continent: 'Asia' },
  { iso: 'SG', name: 'Singapore',       lat:   1.4, lng: 103.8, continent: 'Asia' },
  { iso: 'PH', name: 'Philippines',     lat:  12.9, lng: 121.8, continent: 'Asia' },
  { iso: 'TW', name: 'Taiwan',          lat:  23.7, lng: 121.0, continent: 'Asia' },
  { iso: 'NP', name: 'Nepal',           lat:  28.4, lng:  84.1, continent: 'Asia' },
  { iso: 'KH', name: 'Cambodia',        lat:  12.6, lng: 104.9, continent: 'Asia' },
  { iso: 'LK', name: 'Sri Lanka',       lat:   7.9, lng:  80.8, continent: 'Asia' },
  { iso: 'BT', name: 'Bhutan',          lat:  27.5, lng:  90.4, continent: 'Asia' },
  { iso: 'MM', name: 'Myanmar',         lat:  17.0, lng:  96.5, continent: 'Asia' },
  { iso: 'LA', name: 'Laos',            lat:  17.9, lng: 102.5, continent: 'Asia' },
  { iso: 'MN', name: 'Mongolia',        lat:  46.9, lng: 103.8, continent: 'Asia' },
  { iso: 'BD', name: 'Bangladesh',      lat:  23.7, lng:  90.4, continent: 'Asia' },
  { iso: 'PK', name: 'Pakistan',        lat:  30.4, lng:  69.3, continent: 'Asia' },
  { iso: 'AF', name: 'Afghanistan',     lat:  33.9, lng:  67.7, continent: 'Asia' },
  { iso: 'IQ', name: 'Iraq',            lat:  33.2, lng:  43.7, continent: 'Asia' },
  { iso: 'IR', name: 'Iran',            lat:  32.4, lng:  53.7, continent: 'Asia' },
  { iso: 'SA', name: 'Saudi Arabia',    lat:  23.9, lng:  45.1, continent: 'Asia' },
  { iso: 'AE', name: 'UAE',             lat:  23.4, lng:  53.8, continent: 'Asia' },
  { iso: 'JO', name: 'Jordan',          lat:  31.2, lng:  36.5, continent: 'Asia' },
  { iso: 'IL', name: 'Israel',          lat:  31.0, lng:  35.0, continent: 'Asia' },
  { iso: 'LB', name: 'Lebanon',         lat:  33.9, lng:  35.9, continent: 'Asia' },
  { iso: 'SY', name: 'Syria',           lat:  34.8, lng:  38.9, continent: 'Asia' },
  { iso: 'YE', name: 'Yemen',           lat:  15.6, lng:  48.5, continent: 'Asia' },
  { iso: 'OM', name: 'Oman',            lat:  21.5, lng:  55.9, continent: 'Asia' },
  { iso: 'QA', name: 'Qatar',           lat:  25.4, lng:  51.2, continent: 'Asia' },
  { iso: 'KW', name: 'Kuwait',          lat:  29.3, lng:  47.5, continent: 'Asia' },
  { iso: 'BH', name: 'Bahrain',         lat:  26.0, lng:  50.6, continent: 'Asia' },
  { iso: 'KZ', name: 'Kazakhstan',      lat:  48.0, lng:  66.9, continent: 'Asia' },
  { iso: 'UZ', name: 'Uzbekistan',      lat:  41.4, lng:  64.6, continent: 'Asia' },
  { iso: 'TM', name: 'Turkmenistan',    lat:  39.0, lng:  58.4, continent: 'Asia' },
  { iso: 'TJ', name: 'Tajikistan',      lat:  38.9, lng:  71.3, continent: 'Asia' },
  { iso: 'KG', name: 'Kyrgyzstan',      lat:  41.2, lng:  74.8, continent: 'Asia' },
  { iso: 'AZ', name: 'Azerbaijan',      lat:  40.1, lng:  47.6, continent: 'Asia' },
  { iso: 'MV', name: 'Maldives',        lat:   3.2, lng:  73.2, continent: 'Asia' },
  { iso: 'BN', name: 'Brunei',          lat:   4.5, lng: 114.7, continent: 'Asia' },
  { iso: 'TL', name: 'Timor-Leste',     lat:  -8.9, lng: 125.7, continent: 'Asia' },
  { iso: 'KP', name: 'North Korea',     lat:  40.3, lng: 127.5, continent: 'Asia' },

  // ── Africa ───────────────────────────────────────────────────────────────
  { iso: 'MA', name: 'Morocco',         lat:  31.8, lng:  -7.1, continent: 'Africa' },
  { iso: 'EG', name: 'Egypt',           lat:  26.8, lng:  30.8, continent: 'Africa' },
  { iso: 'KE', name: 'Kenya',           lat:   0.0, lng:  37.9, continent: 'Africa' },
  { iso: 'ZA', name: 'South Africa',    lat: -30.6, lng:  22.9, continent: 'Africa' },
  { iso: 'TZ', name: 'Tanzania',        lat:  -6.4, lng:  34.9, continent: 'Africa' },
  { iso: 'RW', name: 'Rwanda',          lat:  -2.0, lng:  29.9, continent: 'Africa' },
  { iso: 'ET', name: 'Ethiopia',        lat:   9.1, lng:  40.5, continent: 'Africa' },
  { iso: 'SN', name: 'Senegal',         lat:  14.5, lng: -14.5, continent: 'Africa' },
  { iso: 'MG', name: 'Madagascar',      lat: -18.8, lng:  46.9, continent: 'Africa' },
  { iso: 'NA', name: 'Namibia',         lat: -22.0, lng:  17.1, continent: 'Africa' },
  { iso: 'GH', name: 'Ghana',           lat:   7.9, lng:  -1.0, continent: 'Africa' },
  { iso: 'TN', name: 'Tunisia',         lat:  33.9, lng:   9.6, continent: 'Africa' },
  { iso: 'NG', name: 'Nigeria',         lat:   9.1, lng:   8.7, continent: 'Africa' },
  { iso: 'DZ', name: 'Algeria',         lat:  28.0, lng:   2.6, continent: 'Africa' },
  { iso: 'LY', name: 'Libya',           lat:  26.3, lng:  17.2, continent: 'Africa' },
  { iso: 'SD', name: 'Sudan',           lat:  12.9, lng:  30.2, continent: 'Africa' },
  { iso: 'SS', name: 'South Sudan',     lat:   6.9, lng:  31.3, continent: 'Africa' },
  { iso: 'UG', name: 'Uganda',          lat:   1.4, lng:  32.3, continent: 'Africa' },
  { iso: 'CD', name: 'DR Congo',        lat:  -2.9, lng:  23.7, continent: 'Africa' },
  { iso: 'CG', name: 'Congo',           lat:  -0.2, lng:  15.8, continent: 'Africa' },
  { iso: 'CM', name: 'Cameroon',        lat:   3.9, lng:  11.5, continent: 'Africa' },
  { iso: 'CI', name: "Côte d'Ivoire",   lat:   7.5, lng:  -5.5, continent: 'Africa' },
  { iso: 'AO', name: 'Angola',          lat: -11.2, lng:  17.9, continent: 'Africa' },
  { iso: 'ZM', name: 'Zambia',          lat: -13.1, lng:  27.8, continent: 'Africa' },
  { iso: 'ZW', name: 'Zimbabwe',        lat: -20.0, lng:  30.0, continent: 'Africa' },
  { iso: 'MZ', name: 'Mozambique',      lat: -18.7, lng:  35.5, continent: 'Africa' },
  { iso: 'BW', name: 'Botswana',        lat: -22.3, lng:  24.7, continent: 'Africa' },
  { iso: 'ML', name: 'Mali',            lat:  17.6, lng:  -2.0, continent: 'Africa' },
  { iso: 'NE', name: 'Niger',           lat:  17.6, lng:   8.1, continent: 'Africa' },
  { iso: 'TD', name: 'Chad',            lat:  15.5, lng:  18.7, continent: 'Africa' },
  { iso: 'BF', name: 'Burkina Faso',    lat:  12.4, lng:  -1.6, continent: 'Africa' },
  { iso: 'GN', name: 'Guinea',          lat:  10.9, lng: -10.9, continent: 'Africa' },
  { iso: 'BJ', name: 'Benin',           lat:   9.3, lng:   2.3, continent: 'Africa' },
  { iso: 'TG', name: 'Togo',            lat:   8.6, lng:   0.8, continent: 'Africa' },
  { iso: 'GA', name: 'Gabon',           lat:  -0.8, lng:  11.6, continent: 'Africa' },
  { iso: 'ER', name: 'Eritrea',         lat:  15.2, lng:  39.8, continent: 'Africa' },
  { iso: 'DJ', name: 'Djibouti',        lat:  11.8, lng:  42.6, continent: 'Africa' },
  { iso: 'SO', name: 'Somalia',         lat:   5.2, lng:  46.2, continent: 'Africa' },
  { iso: 'MW', name: 'Malawi',          lat: -13.3, lng:  34.3, continent: 'Africa' },
  { iso: 'LR', name: 'Liberia',         lat:   6.4, lng:  -9.4, continent: 'Africa' },
  { iso: 'SL', name: 'Sierra Leone',    lat:   8.5, lng: -11.8, continent: 'Africa' },
  { iso: 'GQ', name: 'Eq. Guinea',      lat:   1.7, lng:  10.3, continent: 'Africa' },
  { iso: 'MU', name: 'Mauritius',       lat: -20.3, lng:  57.6, continent: 'Africa' },
  { iso: 'SC', name: 'Seychelles',      lat:  -4.7, lng:  55.5, continent: 'Africa' },
  { iso: 'CV', name: 'Cape Verde',      lat:  16.0, lng: -24.0, continent: 'Africa' },
  { iso: 'ST', name: 'São Tomé',        lat:   0.2, lng:   6.6, continent: 'Africa' },
  { iso: 'LS', name: 'Lesotho',         lat: -29.6, lng:  28.2, continent: 'Africa' },
  { iso: 'SZ', name: 'Eswatini',        lat: -26.5, lng:  31.5, continent: 'Africa' },

  // ── Oceania ──────────────────────────────────────────────────────────────
  { iso: 'AU', name: 'Australia',       lat: -25.3, lng: 133.8, continent: 'Oceania' },
  { iso: 'NZ', name: 'New Zealand',     lat: -40.9, lng: 174.9, continent: 'Oceania' },
  { iso: 'FJ', name: 'Fiji',            lat: -17.7, lng: 178.1, continent: 'Oceania' },
  { iso: 'PG', name: 'Papua N. Guinea', lat:  -6.3, lng: 143.9, continent: 'Oceania' },
  { iso: 'SB', name: 'Solomon Islands', lat:  -9.6, lng: 160.2, continent: 'Oceania' },
  { iso: 'VU', name: 'Vanuatu',         lat: -16.0, lng: 167.4, continent: 'Oceania' },
  { iso: 'WS', name: 'Samoa',           lat: -13.8, lng:-172.1, continent: 'Oceania' },
  { iso: 'TO', name: 'Tonga',           lat: -21.2, lng:-175.2, continent: 'Oceania' },
];

const CONTINENT_ORDER = ['Europe', 'Americas', 'Asia', 'Africa', 'Oceania'];

const BY_CONTINENT = CONTINENT_ORDER.reduce<Record<string, CountryData[]>>((acc, c) => {
  acc[c] = COUNTRIES.filter((x) => x.continent === c);
  return acc;
}, {});

const TOTAL = COUNTRIES.length;

/** Web Mercator projection → fractional [0,1] position */
function mercatorXY(lat: number, lng: number): { fx: number; fy: number } {
  const fx = (lng + 180) / 360;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const fy = Math.max(0, Math.min(1, 0.5 - mercN / (2 * Math.PI)));
  return { fx: Math.max(0, Math.min(1, fx)), fy };
}

const DOT = 5;
const MAP_ASPECT = 0.52; // height / width

export function CountryMap({
  pins,
  onUpdate,
}: {
  pins: CountryPin[];
  onUpdate: (pins: CountryPin[]) => void;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [mapWidth, setMapWidth] = useState(300);
  const [modalPin, setModalPin] = useState<CountryPin | null>(null);
  const [busy, setBusy] = useState(false);

  const pinMap = useMemo(() => new Map(pins.map((p) => [p.iso, p])), [pins]);

  const visitedCount = pins.filter((p) => p.status === 'visited').length;
  const wantCount = pins.filter((p) => p.status === 'want').length;

  const mapHeight = mapWidth * MAP_ASPECT;

  const toggle = (iso: string, name: string) => {
    const current = pinMap.get(iso);
    const filtered = pins.filter((p) => p.iso !== iso);
    let next: CountryPin[];
    if (!current) {
      next = [...filtered, { iso, country: name, status: 'want' }];
    } else if (current.status === 'want') {
      next = [...filtered, { iso, country: name, status: 'visited', photos: current.photos }];
    } else {
      next = filtered;
    }
    onUpdate(next);
    void haptic.select();
  };

  const openPhotos = (pin: CountryPin) => {
    setModalPin({ ...pin, photos: pin.photos ? [...pin.photos] : [] });
    void haptic.tap();
  };

  const closeModal = () => {
    if (modalPin) {
      onUpdate(pins.map((p) => (p.iso === modalPin.iso ? modalPin : p)));
    }
    setModalPin(null);
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        await haptic.warning();
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        base64: true,
        quality: 0.55,
        allowsEditing: true,
        aspect: [4, 3],
        mediaTypes: ['images'],
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      const asset = result.canceled ? null : result.assets[0];
      if (asset?.base64) {
        const photo: MediaPayload = {
          id: newId('img'),
          base64: asset.base64,
          mime: asset.mimeType ?? 'image/jpeg',
          width: asset.width,
          height: asset.height,
          capturedAt: Date.now(),
        };
        setModalPin((prev) =>
          prev ? { ...prev, photos: [...(prev.photos ?? []), photo] } : prev,
        );
        await haptic.success();
      }
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (photoId: string) => {
    setModalPin((prev) =>
      prev
        ? { ...prev, photos: (prev.photos ?? []).filter((p) => p.id !== photoId) }
        : prev,
    );
    void haptic.tap();
  };

  const visitedW = visitedCount / TOTAL;
  const wantW = wantCount / TOTAL;

  return (
    <View>
      <Eyebrow tone="cool">World Map</Eyebrow>
      <Spacer size={SPACING.md} />

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: SPACING.xl, marginBottom: SPACING.md }}>
        <View>
          <Text variant="title" color={palette.success}>{visitedCount}</Text>
          <Text variant="caption" tone="textFaint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Visited
          </Text>
        </View>
        <View>
          <Text variant="title" color={palette.cool}>{wantCount}</Text>
          <Text variant="caption" tone="textFaint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Want to go
          </Text>
        </View>
        <View>
          <Text variant="title" tone="textFaint">{TOTAL - visitedCount - wantCount}</Text>
          <Text variant="caption" tone="textFaint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Undiscovered
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: palette.border,
          flexDirection: 'row',
          overflow: 'hidden',
          marginBottom: SPACING.xl,
        }}
      >
        <View style={{ flex: visitedW, backgroundColor: palette.success }} />
        <View style={{ flex: wantW, backgroundColor: palette.cool }} />
        <View style={{ flex: Math.max(0, 1 - visitedW - wantW) }} />
      </View>

      {/* Mercator dot map */}
      <View
        onLayout={(e) => setMapWidth(e.nativeEvent.layout.width)}
        style={{
          width: '100%',
          height: mapHeight,
          backgroundColor: palette.surfaceAlt,
          borderRadius: RADIUS.lg,
          overflow: 'hidden',
          marginBottom: SPACING.lg,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        {COUNTRIES.map((c) => {
          const { fx, fy } = mercatorXY(c.lat, c.lng);
          const pin = pinMap.get(c.iso);
          const dotColor =
            pin?.status === 'visited'
              ? palette.success
              : pin?.status === 'want'
              ? palette.cool
              : palette.border;
          return (
            <View
              key={c.iso}
              style={{
                position: 'absolute',
                left: fx * mapWidth - DOT / 2,
                top: fy * mapHeight - DOT / 2,
                width: DOT,
                height: DOT,
                borderRadius: DOT / 2,
                backgroundColor: dotColor,
                opacity: pin ? 1 : 0.25,
              }}
            />
          );
        })}
      </View>

      {/* Hint */}
      <Text variant="caption" tone="textFaint" style={{ marginBottom: SPACING.xl }}>
        Tap → want · tap again → visited · tap again → remove · long-press visited to add photos
      </Text>

      {/* Continent chip grids */}
      {CONTINENT_ORDER.map((continent) => (
        <View key={continent} style={{ marginBottom: SPACING.xl }}>
          <Text
            variant="eyebrow"
            tone="textMuted"
            style={{ textTransform: 'uppercase', letterSpacing: 2, marginBottom: SPACING.sm }}
          >
            {continent}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
            {BY_CONTINENT[continent].map((c) => {
              const pin = pinMap.get(c.iso);
              const isVisited = pin?.status === 'visited';
              const isWant = pin?.status === 'want';
              const hasPhotos = isVisited && (pin?.photos?.length ?? 0) > 0;
              return (
                <PressableScale
                  key={c.iso}
                  onPress={() => toggle(c.iso, c.name)}
                  onLongPress={isVisited ? () => openPhotos(pin!) : undefined}
                  hapticOnPress="none"
                  scaleTo={0.9}
                >
                  <View
                    style={{
                      paddingHorizontal: SPACING.sm + 2,
                      paddingVertical: 5,
                      borderRadius: RADIUS.pill,
                      borderWidth: 1,
                      borderColor: isVisited
                        ? palette.success
                        : isWant
                        ? palette.cool
                        : palette.border,
                      backgroundColor: isVisited ? palette.success + '22' : 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text
                      variant="caption"
                      color={
                        isVisited
                          ? palette.success
                          : isWant
                          ? palette.cool
                          : palette.textFaint
                      }
                    >
                      {isVisited ? '◍ ' : isWant ? '◯ ' : ''}
                      {c.name}
                    </Text>
                    {hasPhotos ? (
                      <Text variant="caption" color={palette.success} style={{ fontSize: 9 }}>
                        ⊞
                      </Text>
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}

      {/* Country photo modal */}
      <Modal
        visible={!!modalPin}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={closeModal}
      >
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: SPACING.lg,
              paddingTop: (Platform.OS === 'ios' ? SPACING.lg : insets.top + SPACING.lg),
              paddingBottom: SPACING.md,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="heading">{modalPin?.country}</Text>
              <Text variant="caption" tone="textFaint">
                {modalPin?.status === 'visited' ? '◍ Visited' : '◯ Want to go'}
              </Text>
            </View>
            <PressableScale onPress={closeModal} hapticOnPress="tap" scaleTo={0.92}>
              <View
                style={{
                  paddingHorizontal: SPACING.lg,
                  paddingVertical: SPACING.sm,
                  borderRadius: RADIUS.pill,
                  backgroundColor: palette.accent,
                }}
              >
                <Text variant="label" color={palette.onAccent}>
                  Done
                </Text>
              </View>
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
            <Text variant="eyebrow" tone="cool" style={{ marginBottom: SPACING.md }}>
              Photos from {modalPin?.country}
            </Text>

            {/* Photo grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {(modalPin?.photos ?? []).map((p) => (
                <PressableScale
                  key={p.id}
                  onPress={() => removePhoto(p.id)}
                  hapticOnPress="none"
                  scaleTo={0.92}
                >
                  <Image
                    source={{ uri: `data:${p.mime};base64,${p.base64}` }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: RADIUS.md,
                      borderWidth: 1,
                      borderColor: palette.border,
                    }}
                  />
                </PressableScale>
              ))}

              {/* Add photo tiles */}
              <PhotoAddTile
                glyph="◎"
                label="Camera"
                onPress={() => void pickPhoto('camera')}
                disabled={busy}
              />
              <PhotoAddTile
                glyph="⊞"
                label="Library"
                onPress={() => void pickPhoto('library')}
                disabled={busy}
              />
            </View>

            {(modalPin?.photos ?? []).length === 0 ? (
              <>
                <Spacer size={SPACING.sm} />
                <Text variant="caption" tone="textFaint">
                  Add photos from this country. Tap a photo to remove it.
                </Text>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function PhotoAddTile({
  glyph,
  label,
  onPress,
  disabled,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const palette = usePalette();
  return (
    <PressableScale onPress={onPress} disabled={disabled} hapticOnPress="tap" scaleTo={0.92}>
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: palette.border,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          backgroundColor: palette.surfaceAlt,
        }}
      >
        <Text variant="heading" tone="accent">{glyph}</Text>
        <Text variant="caption" tone="textFaint" style={{ fontSize: 10 }}>{label}</Text>
      </View>
    </PressableScale>
  );
}
