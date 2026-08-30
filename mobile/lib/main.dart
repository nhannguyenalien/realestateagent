import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'flows.dart';
part 'marketplace_flows.dart';
part 'data.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalStore.initialize();
  await AuthRepository.instance.restore();
  runApp(const PropertioApp());
}

const brand = Color(0xFF5639F3);
const ink = Color(0xFF17152B);

class Property {
  const Property(
    this.title,
    this.location,
    this.price,
    this.image, {
    this.beds = 4,
    this.baths = 3,
    this.area = 2000,
    this.featured = false,
    this.id = '',
    this.slug = '',
    this.latitude = 40.7128,
    this.longitude = -74.0060,
    this.type = 'House',
  });
  final String title, location, price, image;
  final String id, slug;
  final int beds, baths, area;
  final bool featured;
  final double latitude, longitude;
  final String type;

  double get numericPrice =>
      double.tryParse(price.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;

  factory Property.fromJson(Map<String, dynamic> json) {
    final rawPrice = (json['price'] as num?)?.toDouble() ?? 0;
    final image = json['imageUrl']?.toString() ?? '';
    return Property(
      json['title']?.toString() ?? 'Untitled property',
      [
        json['city'],
        json['region'],
      ].whereType<String>().where((v) => v.isNotEmpty).join(', '),
      '\$${rawPrice.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',')}',
      image.startsWith('/') ? '$apiBaseUrl$image' : image,
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      beds: (json['bedrooms'] as num?)?.toInt() ?? 0,
      baths: (json['bathrooms'] as num?)?.toInt() ?? 0,
      area: (((json['areaSqm'] as num?)?.toDouble() ?? 0) * 10.764).round(),
      latitude: (json['latitude'] as num?)?.toDouble() ?? 40.7128,
      longitude: (json['longitude'] as num?)?.toDouble() ?? -74.0060,
      type:
          json['propertyType']?.toString() ??
          json['type']?.toString() ??
          'House',
    );
  }
}

const properties = [
  Property(
    'Deluxe Apartment',
    '2BW Street, New York',
    '\$267,000',
    'assets/images/property_1.png',
    featured: true,
    type: 'Apartment',
    latitude: 40.7580,
    longitude: -73.9855,
  ),
  Property(
    'Modern Family House',
    'Central Park, New York',
    '\$320,000',
    'assets/images/property_2.png',
    latitude: 40.7812,
    longitude: -73.9665,
    type: 'House',
  ),
  Property(
    'Skyline Residence',
    'Brooklyn, New York',
    '\$418,000',
    'assets/images/property_3.png',
    beds: 3,
    baths: 2,
    latitude: 40.6782,
    longitude: -73.9442,
    type: 'Apartment',
  ),
  Property(
    'Garden View Villa',
    'Queens, New York',
    '\$289,000',
    'assets/images/property_4.png',
    beds: 5,
    baths: 4,
    latitude: 40.7282,
    longitude: -73.7949,
    type: 'House',
  ),
  Property(
    'Urban Loft',
    'Manhattan, New York',
    '\$540,000',
    'assets/images/property_5.png',
    beds: 2,
    baths: 2,
    latitude: 40.7484,
    longitude: -73.9857,
    type: 'Office',
  ),
  Property(
    'Riverside Home',
    'Long Island, New York',
    '\$375,000',
    'assets/images/property_6.png',
    latitude: 40.7891,
    longitude: -73.1350,
    type: 'House',
  ),
];

class PropertioApp extends StatefulWidget {
  const PropertioApp({super.key, this.initialAuthenticated});
  final bool? initialAuthenticated;
  @override
  State<PropertioApp> createState() => _PropertioAppState();
}

class _PropertioAppState extends State<PropertioApp> {
  ThemeMode mode = ThemeMode.dark;
  late bool authenticated =
      widget.initialAuthenticated ?? AuthRepository.instance.isAuthenticated;
  late Locale locale = Locale(LocalStore.localeCode);
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Propertio',
    locale: locale,
    themeMode: mode,
    theme: _theme(Brightness.light),
    darkTheme: _theme(Brightness.dark),
    supportedLocales: const [
      Locale('en'),
      Locale('ja'),
      Locale('fr'),
      Locale('es'),
      Locale('vi'),
    ],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: authenticated
        ? MainShell(
            onThemeChanged: () => setState(
              () => mode = mode == ThemeMode.dark
                  ? ThemeMode.light
                  : ThemeMode.dark,
            ),
            onLogout: () async {
              await AuthRepository.instance.logout();
              if (mounted) setState(() => authenticated = false);
            },
            onLocaleChanged: (value) async {
              await LocalStore.setLocale(value.languageCode);
              if (mounted) setState(() => locale = value);
            },
          )
        : WelcomeFlow(
            onAuthenticated: () => setState(() => authenticated = true),
          ),
  );
}

ThemeData _theme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: brand,
    brightness: brightness,
    surface: dark ? ink : const Color(0xFFF8F7FC),
  );
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark
        ? const Color(0xFF121024)
        : const Color(0xFFF8F7FC),
    fontFamily: 'Arial',
    cardTheme: CardThemeData(
      color: dark ? const Color(0xFF211E39) : Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? const Color(0xFF211E39) : Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
    ),
  );
}

class MainShell extends StatefulWidget {
  const MainShell({
    super.key,
    required this.onThemeChanged,
    required this.onLogout,
    required this.onLocaleChanged,
  });
  final VoidCallback onThemeChanged;
  final VoidCallback onLogout;
  final ValueChanged<Locale> onLocaleChanged;
  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int index = 0;
  late final pages = [
    const HomeScreen(),
    const ListingsScreen(),
    const SavedScreen(),
    ProfileScreen(
      onThemeChanged: widget.onThemeChanged,
      onLogout: widget.onLogout,
      onLocaleChanged: widget.onLocaleChanged,
    ),
  ];
  @override
  Widget build(BuildContext context) => Scaffold(
    body: IndexedStack(index: index, children: pages),
    bottomNavigationBar: NavigationBar(
      height: 68,
      selectedIndex: index,
      indicatorColor: brand.withValues(alpha: .18),
      onDestinationSelected: (value) => setState(() => index = value),
      destinations: [
        NavigationDestination(
          icon: const Icon(Icons.home_outlined),
          selectedIcon: const Icon(Icons.home),
          label: tr(context, 'home'),
        ),
        NavigationDestination(
          icon: const Icon(Icons.search),
          label: tr(context, 'explore'),
        ),
        NavigationDestination(
          icon: const Icon(Icons.favorite_border),
          selectedIcon: const Icon(Icons.favorite),
          label: tr(context, 'saved'),
        ),
        NavigationDestination(
          icon: const Icon(Icons.person_outline),
          label: tr(context, 'profile'),
        ),
      ],
    ),
  );
}

class PageBody extends StatelessWidget {
  const PageBody({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => SafeArea(child: child);
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) => PageBody(
    child: ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
      children: [
        Row(
          children: [
            const CircleAvatar(
              radius: 22,
              backgroundImage: AssetImage('assets/images/avatar.png'),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Hello!', style: TextStyle(color: Colors.grey)),
                  Text(
                    'James Butler',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
            IconButton.filledTonal(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              ),
              icon: const Icon(Icons.notifications_none_rounded),
            ),
          ],
        ),
        const SizedBox(height: 24),
        TextField(
          readOnly: true,
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const ListingsScreen(showBack: true),
            ),
          ),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            hintText: 'Search property, city or address',
            suffixIcon: Icon(Icons.tune),
          ),
        ),
        const SizedBox(height: 26),
        const SectionTitle('Property types'),
        const SizedBox(height: 14),
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TypeButton(Icons.house_rounded, 'House'),
            TypeButton(Icons.apartment_rounded, 'Apartment'),
            TypeButton(Icons.business_rounded, 'Office'),
            TypeButton(Icons.landscape_rounded, 'Land'),
          ],
        ),
        const SizedBox(height: 22),
        Card(
          color: brand,
          child: ListTile(
            contentPadding: const EdgeInsets.all(14),
            leading: const Icon(
              Icons.calculate_outlined,
              color: Colors.white,
              size: 34,
            ),
            title: const Text(
              'Estimate construction cost',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
            subtitle: const Text(
              'Plan materials and budget in minutes',
              style: TextStyle(color: Colors.white70),
            ),
            trailing: const Icon(Icons.arrow_forward, color: Colors.white),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CostEstimatorScreen()),
            ),
          ),
        ),
        const SizedBox(height: 28),
        const SectionTitle('Featured property', trailing: 'See all'),
        const SizedBox(height: 14),
        SizedBox(
          height: 285,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: 3,
            separatorBuilder: (_, _) => const SizedBox(width: 14),
            itemBuilder: (_, i) => SizedBox(
              width: 270,
              child: PropertyCard(property: properties[i], large: true),
            ),
          ),
        ),
        const SizedBox(height: 28),
        const SectionTitle('Recommended for you', trailing: 'See all'),
        const SizedBox(height: 12),
        ...properties
            .skip(3)
            .map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: PropertyCard(property: p),
              ),
            ),
      ],
    ),
  );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.trailing});
  final String title;
  final String? trailing;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          title,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
      ),
      if (trailing != null)
        Text(
          trailing!,
          style: const TextStyle(color: brand, fontWeight: FontWeight.w600),
        ),
    ],
  );
}

class TypeButton extends StatelessWidget {
  const TypeButton(this.icon, this.label, {super.key});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Container(
        width: 58,
        height: 58,
        decoration: BoxDecoration(
          color: brand.withValues(alpha: .13),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Icon(icon, color: brand),
      ),
      const SizedBox(height: 8),
      Text(label, style: const TextStyle(fontSize: 12)),
    ],
  );
}

class PropertyCard extends StatefulWidget {
  const PropertyCard({super.key, required this.property, this.large = false});
  final Property property;
  final bool large;
  @override
  State<PropertyCard> createState() => _PropertyCardState();
}

class _PropertyCardState extends State<PropertyCard> {
  bool saved = false;

  @override
  void initState() {
    super.initState();
    LocalStore.favoriteTitles.addListener(_syncSaved);
    LocalStore.initialize().then((_) => _syncSaved());
  }

  void _syncSaved() {
    if (!mounted) return;
    final next = LocalStore.favoriteTitles.value.contains(
      widget.property.title,
    );
    if (next != saved) setState(() => saved = next);
  }

  @override
  void dispose() {
    LocalStore.favoriteTitles.removeListener(_syncSaved);
    super.dispose();
  }

  Future<void> _toggleSaved() async {
    await LocalStore.toggleFavorite(widget.property.title);
  }

  Future<void> _openProperty(Property property) async {
    await LocalStore.viewed(property.title);
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PropertyDetail(property: property)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.property;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _openProperty(p),
        child: widget.large
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _image(p)),
                  _details(p),
                ],
              )
            : SizedBox(
                height: 126,
                child: Row(
                  children: [
                    SizedBox(width: 132, height: 126, child: _image(p)),
                    Expanded(child: _details(p)),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _image(Property p) => Stack(
    fit: StackFit.expand,
    children: [
      propertyImage(p.image),
      Positioned(
        top: 9,
        right: 9,
        child: CircleAvatar(
          radius: 17,
          backgroundColor: Colors.black54,
          child: IconButton(
            padding: EdgeInsets.zero,
            iconSize: 17,
            onPressed: _toggleSaved,
            icon: Icon(
              saved ? Icons.favorite : Icons.favorite_border,
              color: saved ? Colors.redAccent : Colors.white,
            ),
          ),
        ),
      ),
    ],
  );
  Widget _details(Property p) => Padding(
    padding: const EdgeInsets.all(13),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          p.title,
          maxLines: 1,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        const SizedBox(height: 5),
        Text(
          p.location,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.grey, fontSize: 12),
        ),
        const SizedBox(height: 9),
        Text(
          p.price,
          style: const TextStyle(
            color: brand,
            fontWeight: FontWeight.w800,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 7),
        Text(
          '${p.area} sqft  •  ${p.beds} beds  •  ${p.baths} baths',
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
      ],
    ),
  );
}

class ListingsScreen extends StatefulWidget {
  const ListingsScreen({super.key, this.showBack = false});
  final bool showBack;
  @override
  State<ListingsScreen> createState() => _ListingsScreenState();
}

class _ListingsScreenState extends State<ListingsScreen> {
  String query = '';
  int selected = 0;
  bool mapMode = true;
  bool loading = true;
  List<Property> remoteProperties = properties;
  PropertyFilters? filters;
  Position? currentPosition;

  Future<void> _nearMe() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Turn on location services to search nearby.'),
          ),
        );
      }
      return;
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Location permission is required for nearby search.'),
          ),
        );
      }
      return;
    }
    final position = await Geolocator.getCurrentPosition();
    if (!mounted) return;
    setState(() => currentPosition = position);
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    final result = await PropertyRepository.instance.list(
      query: query,
      type: selected == 0
          ? null
          : ['All', 'House', 'Apartment', 'Office'][selected],
    );
    if (!mounted) return;
    setState(() {
      remoteProperties = result;
      loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final shown = remoteProperties
        .where(
          (p) =>
              (p.title.toLowerCase().contains(query.toLowerCase()) ||
                  p.location.toLowerCase().contains(query.toLowerCase())) &&
              (filters == null || filters!.matches(p)),
        )
        .toList();
    if (currentPosition != null) {
      shown.sort(
        (a, b) =>
            Geolocator.distanceBetween(
              currentPosition!.latitude,
              currentPosition!.longitude,
              a.latitude,
              a.longitude,
            ).compareTo(
              Geolocator.distanceBetween(
                currentPosition!.latitude,
                currentPosition!.longitude,
                b.latitude,
                b.longitude,
              ),
            ),
      );
    }
    return Scaffold(
      appBar: widget.showBack
          ? AppBar(title: const Text('Explore properties'))
          : null,
      body: PageBody(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!widget.showBack)
                    const Text(
                      'Find your dream home',
                      style: TextStyle(
                        fontSize: 25,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  const SizedBox(height: 15),
                  TextField(
                    onChanged: (v) => setState(() => query = v),
                    onSubmitted: (_) => _load(),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.search),
                      hintText: 'Search by city, property or address',
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.tune),
                        onPressed: () async {
                          final result =
                              await showModalBottomSheet<PropertyFilters>(
                                context: context,
                                isScrollControlled: true,
                                builder: (_) => FilterSheet(initial: filters),
                              );
                          if (result != null && mounted) {
                            setState(
                              () => filters = result.isActive ? result : null,
                            );
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: _nearMe,
                      icon: Icon(
                        currentPosition == null
                            ? Icons.my_location
                            : Icons.location_on,
                        color: brand,
                      ),
                      label: Text(
                        currentPosition == null
                            ? 'Search near me'
                            : 'Sorted by distance',
                      ),
                    ),
                  ),
                  if (filters != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${filters!.type} • ${filters!.beds}+ beds • ${filters!.priceLabel}',
                            style: const TextStyle(
                              color: brand,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: () => setState(() => filters = null),
                          child: const Text('Clear'),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 13),
                  SizedBox(
                    height: 38,
                    child: Row(
                      children: [
                        Expanded(
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: 4,
                            separatorBuilder: (_, _) =>
                                const SizedBox(width: 8),
                            itemBuilder: (_, i) {
                              final labels = [
                                'All',
                                'House',
                                'Apartment',
                                'Office',
                              ];
                              return ChoiceChip(
                                label: Text(labels[i]),
                                selected: selected == i,
                                onSelected: (_) {
                                  setState(() => selected = i);
                                  _load();
                                },
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filledTonal(
                          tooltip: mapMode ? 'Show list' : 'Show map',
                          onPressed: () => setState(() => mapMode = !mapMode),
                          icon: Icon(
                            mapMode ? Icons.view_list : Icons.map_outlined,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : shown.isEmpty
                  ? const Center(child: Text('No properties found'))
                  : mapMode
                  ? PropertyMap(properties: shown)
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount: shown.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (_, i) => PropertyCard(property: shown[i]),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class SavedScreen extends StatefulWidget {
  const SavedScreen({super.key});
  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  final selected = <String>{};

  @override
  void initState() {
    super.initState();
    LocalStore.initialize();
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<Set<String>>(
    valueListenable: LocalStore.favoriteTitles,
    builder: (context, favorites, _) {
      final savedProperties = PropertyRepository.instance.latestProperties
          .where((property) => favorites.contains(property.title))
          .toList();
      final comparable = savedProperties
          .where((property) => selected.contains(property.title))
          .toList();
      return Scaffold(
        appBar: AppBar(
          title: const Text('Saved properties'),
          actions: [
            TextButton.icon(
              onPressed: comparable.length < 2
                  ? null
                  : () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => CompareScreen(properties: comparable),
                      ),
                    ),
              icon: const Icon(Icons.compare_arrows),
              label: Text(
                'Compare ${comparable.isEmpty ? '' : '(${comparable.length})'}',
              ),
            ),
          ],
        ),
        body: savedProperties.isEmpty
            ? const _EmptyCollection(
                icon: Icons.favorite_border,
                title: 'No saved properties yet',
                message: 'Tap the heart on a property to keep it here.',
              )
            : ListView.separated(
                padding: const EdgeInsets.all(20),
                itemCount: savedProperties.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (_, i) {
                  final property = savedProperties[i];
                  return Stack(
                    children: [
                      PropertyCard(property: property),
                      Positioned(
                        left: 8,
                        top: 8,
                        child: Checkbox(
                          value: selected.contains(property.title),
                          onChanged: (value) => setState(() {
                            value == true
                                ? selected.add(property.title)
                                : selected.remove(property.title);
                          }),
                        ),
                      ),
                    ],
                  );
                },
              ),
      );
    },
  );
}

class RecentlyViewedScreen extends StatefulWidget {
  const RecentlyViewedScreen({super.key});

  @override
  State<RecentlyViewedScreen> createState() => _RecentlyViewedScreenState();
}

class _RecentlyViewedScreenState extends State<RecentlyViewedScreen> {
  List<Property>? viewedProperties;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final titles = await LocalStore.recentlyViewed();
    final available = PropertyRepository.instance.latestProperties;
    final result = <Property>[];
    for (final title in titles) {
      for (final property in available) {
        if (property.title == title) {
          result.add(property);
          break;
        }
      }
    }
    if (mounted) setState(() => viewedProperties = result);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Recently viewed')),
    body: viewedProperties == null
        ? const Center(child: CircularProgressIndicator())
        : viewedProperties!.isEmpty
        ? const _EmptyCollection(
            icon: Icons.history,
            title: 'No viewing history',
            message: 'Properties you open will appear here.',
          )
        : ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: viewedProperties!.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (_, i) => PropertyCard(property: viewedProperties![i]),
          ),
  );
}

class _EmptyCollection extends StatelessWidget {
  const _EmptyCollection({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 64, color: brand),
          const SizedBox(height: 18),
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey),
          ),
        ],
      ),
    ),
  );
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.onThemeChanged,
    required this.onLogout,
    required this.onLocaleChanged,
  });
  final VoidCallback onThemeChanged;
  final VoidCallback onLogout;
  final ValueChanged<Locale> onLocaleChanged;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Profile'),
      actions: [
        IconButton(onPressed: onThemeChanged, icon: const Icon(Icons.contrast)),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const CircleAvatar(
          radius: 45,
          backgroundImage: AssetImage('assets/images/avatar.png'),
        ),
        const SizedBox(height: 12),
        const Center(
          child: Text(
            'James Butler',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
        ),
        const Center(
          child: Text('Property owner', style: TextStyle(color: Colors.grey)),
        ),
        const SizedBox(height: 26),
        ...[
          (Icons.person_outline, 'Personal profile'),
          (Icons.home_work_outlined, 'My properties'),
          (Icons.history, 'Recently viewed'),
          (Icons.calendar_month_outlined, 'Viewing schedule'),
          (Icons.groups_outlined, 'Agents & agencies'),
          (Icons.inbox_outlined, 'Lead inbox'),
          (Icons.account_balance_wallet_outlined, 'Payments & wallet'),
          (Icons.language, 'Language'),
          (Icons.settings_outlined, 'Settings'),
        ].map(
          (item) => Card(
            child: ListTile(
              leading: Icon(item.$1, color: brand),
              title: Text(item.$2),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                if (item.$2 == 'Language') {
                  showDialog<void>(
                    context: context,
                    builder: (dialogContext) => SimpleDialog(
                      title: const Text('Language'),
                      children:
                          const [
                                ('en', 'English'),
                                ('ja', '日本語'),
                                ('fr', 'Français'),
                                ('es', 'Español'),
                                ('vi', 'Tiếng Việt'),
                              ]
                              .map(
                                (language) => SimpleDialogOption(
                                  onPressed: () {
                                    onLocaleChanged(Locale(language.$1));
                                    Navigator.pop(dialogContext);
                                  },
                                  child: Text(language.$2),
                                ),
                              )
                              .toList(),
                    ),
                  );
                  return;
                }
                if (item.$2 == 'Agents & agencies') {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const AgentNetworkScreen(),
                    ),
                  );
                } else if (item.$2 == 'Lead inbox') {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AgentLeadsScreen()),
                  );
                } else if (item.$2 == 'Viewing schedule') {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ScheduleScreen()),
                  );
                } else if (item.$2 == 'My properties') {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const AgentDashboardScreen(),
                    ),
                  );
                } else if (item.$2 == 'Recently viewed') {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const RecentlyViewedScreen(),
                    ),
                  );
                }
              },
            ),
          ),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: onLogout,
          icon: const Icon(Icons.logout),
          label: const Text('Log out'),
        ),
      ],
    ),
  );
}

class PropertyDetail extends StatefulWidget {
  const PropertyDetail({super.key, required this.property});
  final Property property;

  @override
  State<PropertyDetail> createState() => _PropertyDetailState();
}

class _PropertyDetailState extends State<PropertyDetail> {
  bool saved = false;

  Property get property => widget.property;

  @override
  void initState() {
    super.initState();
    LocalStore.favoriteTitles.addListener(_syncSaved);
    LocalStore.initialize().then((_) => _syncSaved());
  }

  void _syncSaved() {
    if (!mounted) return;
    final next = LocalStore.favoriteTitles.value.contains(property.title);
    if (saved != next) setState(() => saved = next);
  }

  @override
  void dispose() {
    LocalStore.favoriteTitles.removeListener(_syncSaved);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 320,
          pinned: true,
          actions: [
            IconButton.filledTonal(
              onPressed: () => LocalStore.toggleFavorite(property.title),
              icon: Icon(
                saved ? Icons.favorite : Icons.favorite_border,
                color: saved ? Colors.redAccent : null,
              ),
            ),
            const SizedBox(width: 10),
          ],
          flexibleSpace: FlexibleSpaceBar(
            background: Hero(
              tag: property.image,
              child: propertyImage(property.image),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 110),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        property.title,
                        style: const TextStyle(
                          fontSize: 25,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Text(
                      property.price,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: brand,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  property.location,
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 22),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _Fact(Icons.square_foot, '${property.area}', 'sqft'),
                    _Fact(Icons.bed_outlined, '${property.beds}', 'beds'),
                    _Fact(Icons.bathtub_outlined, '${property.baths}', 'baths'),
                    const _Fact(Icons.garage_outlined, '1', 'garage'),
                  ],
                ),
                const SizedBox(height: 28),
                const SectionTitle('Description'),
                const SizedBox(height: 10),
                const Text(
                  'A beautifully designed home with generous living spaces, natural light and modern finishes. Located close to schools, shopping and public transportation.',
                  style: TextStyle(height: 1.6, color: Colors.grey),
                ),
                const SizedBox(height: 26),
                const SectionTitle('Amenities'),
                const SizedBox(height: 12),
                const Wrap(
                  spacing: 9,
                  runSpacing: 9,
                  children: [
                    Chip(label: Text('Parking')),
                    Chip(label: Text('Garden')),
                    Chip(label: Text('Security')),
                    Chip(label: Text('Air conditioning')),
                    Chip(label: Text('Wi-Fi')),
                  ],
                ),
                const SizedBox(height: 26),
                const SectionTitle('Listed by'),
                const SizedBox(height: 12),
                const Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundImage: AssetImage('assets/images/avatar.png'),
                    ),
                    title: Text(
                      'James Butler',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text('Licensed property agent'),
                    trailing: Icon(Icons.verified, color: brand),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
    bottomSheet: SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
        child: SizedBox(
          width: double.infinity,
          height: 54,
          child: FilledButton(
            onPressed: () => showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              builder: (_) => BookingSheet(property: property),
            ),
            style: FilledButton.styleFrom(backgroundColor: brand),
            child: const Text(
              'Schedule a tour',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ),
    ),
  );
}

class _Fact extends StatelessWidget {
  const _Fact(this.icon, this.value, this.label);
  final IconData icon;
  final String value, label;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: brand.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Icon(icon, color: brand),
      ),
      const SizedBox(height: 7),
      Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
      Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
    ],
  );
}
