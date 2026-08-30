part of 'main.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://127.0.0.1:8788',
);

class ApiException implements Exception {
  const ApiException(this.message, [this.statusCode]);
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class AuthRepository {
  AuthRepository._();
  static final instance = AuthRepository._();
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'propertio_session_token';
  String? token;
  Map<String, dynamic>? user;
  bool get isAuthenticated => token?.isNotEmpty == true;

  Future<void> restore() async {
    token = await _storage.read(key: _tokenKey);
    if (token == null) return;
    try {
      final response = await ApiClient.instance.get('/api/auth/me');
      user = response['user'] as Map<String, dynamic>?;
    } catch (_) {
      await clear();
    }
  }

  Future<void> signInWithGoogle() async {
    const serverClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
    final account = await GoogleSignIn(
      scopes: const ['email', 'profile'],
      serverClientId: serverClientId.isEmpty ? null : serverClientId,
    ).signIn();
    if (account == null) {
      throw const ApiException('Google sign-in was cancelled.');
    }
    final idToken = (await account.authentication).idToken;
    if (idToken == null) {
      throw const ApiException(
        'Google did not return an ID token. Check the OAuth client configuration.',
      );
    }
    final response = await ApiClient.instance.post('/api/auth/mobile/google', {
      'idToken': idToken,
    }, authenticated: false);
    token = response['token']?.toString();
    user = response['user'] as Map<String, dynamic>?;
    if (token == null) {
      throw const ApiException('The server did not create a session.');
    }
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<void> logout() async {
    try {
      await ApiClient.instance.post('/api/auth/logout', const {});
    } catch (_) {}
    await GoogleSignIn().signOut().catchError((_) {
      return null;
    });
    await clear();
  }

  Future<void> clear() async {
    token = null;
    user = null;
    await _storage.delete(key: _tokenKey);
  }
}

class ApiClient {
  ApiClient._();
  static final instance = ApiClient._();
  Map<String, String> _headers({bool authenticated = true}) => {
    'content-type': 'application/json',
    'accept': 'application/json',
    if (authenticated && AuthRepository.instance.token != null)
      'authorization': 'Bearer ${AuthRepository.instance.token}',
  };
  Future<Map<String, dynamic>> get(String path) async => _decode(
    await http
        .get(Uri.parse('$apiBaseUrl$path'), headers: _headers())
        .timeout(const Duration(seconds: 12)),
  );
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool authenticated = true,
  }) async => _decode(
    await http
        .post(
          Uri.parse('$apiBaseUrl$path'),
          headers: _headers(authenticated: authenticated),
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 20)),
  );
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async => _decode(
    await http
        .patch(
          Uri.parse('$apiBaseUrl$path'),
          headers: _headers(),
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 20)),
  );
  Future<Map<String, dynamic>> upload(XFile file) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$apiBaseUrl/api/uploads'),
    );
    final token = AuthRepository.instance.token;
    if (token != null) request.headers['authorization'] = 'Bearer $token';
    request.files.add(
      http.MultipartFile.fromBytes(
        'file',
        await file.readAsBytes(),
        filename: file.name,
      ),
    );
    return _decode(
      await http.Response.fromStream(
        await request.send().timeout(const Duration(seconds: 120)),
      ),
    );
  }

  Map<String, dynamic> _decode(http.Response response) {
    final body = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        body['error']?.toString() ?? 'Request failed.',
        response.statusCode,
      );
    }
    return body;
  }
}

Widget propertyImage(String source, {double? width, double? height}) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return Image.network(
      source,
      width: width,
      height: height,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => _imageFallback(),
    );
  }
  return Image.asset(
    source.isEmpty ? 'assets/images/property_1.png' : source,
    width: width,
    height: height,
    fit: BoxFit.cover,
    errorBuilder: (_, _, _) => _imageFallback(),
  );
}

Widget _imageFallback() => Container(
  color: brand.withValues(alpha: .12),
  alignment: Alignment.center,
  child: const Icon(Icons.home_work_outlined, color: brand, size: 42),
);

class PropertyRepository {
  PropertyRepository._();
  static final instance = PropertyRepository._();
  List<Property> latestProperties = properties;
  Future<List<Map<String, dynamic>>> agentListings() async {
    final body = await ApiClient.instance.get('/api/agent/properties');
    return (body['properties'] as List? ?? const [])
        .cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> createDraft(Map<String, dynamic> draft) async =>
      (await ApiClient.instance.post(
            '/api/agent/properties',
            draft,
          ))['property']
          as Map<String, dynamic>;
  Future<Map<String, dynamic>> updateListing(
    String id,
    Map<String, dynamic> changes,
  ) async =>
      (await ApiClient.instance.patch(
            '/api/agent/properties/$id',
            changes,
          ))['property']
          as Map<String, dynamic>;

  Future<List<Property>> list({String query = '', String? type}) async {
    try {
      final params = <String, String>{'limit': '24'};
      if (query.trim().isNotEmpty) params['q'] = query.trim();
      if (type != null) params['type'] = type;
      final uri = Uri.parse(
        '$apiBaseUrl/api/properties/',
      ).replace(queryParameters: params);
      final response = await http.get(uri).timeout(const Duration(seconds: 4));
      if (response.statusCode != 200) {
        throw Exception('API ${response.statusCode}');
      }
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final rows = body['properties'] as List<dynamic>? ?? const [];
      final result = rows
          .map((row) => Property.fromJson(row as Map<String, dynamic>))
          .toList();
      latestProperties = result.isEmpty ? properties : result;
      return latestProperties;
    } catch (_) {
      latestProperties = properties;
      return latestProperties;
    }
  }

  Future<List<Map<String, dynamic>>> viewings() async =>
      ((await ApiClient.instance.get('/api/viewings'))['viewings'] as List? ??
              const [])
          .cast<Map<String, dynamic>>();
  Future<List<Map<String, dynamic>>> leads() async =>
      ((await ApiClient.instance.get('/api/agent/leads'))['leads'] as List? ??
              const [])
          .cast<Map<String, dynamic>>();
  Future<List<Map<String, dynamic>>> agencies() async =>
      ((await ApiClient.instance.get('/api/agencies'))['agencies'] as List? ??
              const [])
          .cast<Map<String, dynamic>>();
  Future<List<Map<String, dynamic>>> agents() async =>
      ((await ApiClient.instance.get('/api/agents'))['agents'] as List? ??
              const [])
          .cast<Map<String, dynamic>>();
  Future<void> scheduleViewing(Property property, DateTime startsAt) async {
    if (property.id.isEmpty) {
      throw const ApiException(
        'This demo property is not available for online scheduling.',
      );
    }
    await ApiClient.instance.post('/api/viewings', {
      'propertyId': property.id,
      'startsAt': startsAt.toUtc().toIso8601String(),
      'name': AuthRepository.instance.user?['name'],
      'email': AuthRepository.instance.user?['email'],
    });
  }

  Future<int> syncOfflineDrafts() async {
    await LocalStore.initialize();
    var synced = 0;
    for (final draft in List<Map<String, String>>.of(LocalStore.drafts.value)) {
      await createDraft({
        'title': draft['title'],
        'address': draft['address'],
        'city': draft['city'],
        'price': double.tryParse(draft['price'] ?? ''),
        'areaSqm': double.tryParse(draft['area'] ?? ''),
        'propertyType': 'house',
      });
      await LocalStore.deleteDraft(draft['createdAt'] ?? '');
      synced++;
    }
    return synced;
  }
}

class LocalStore {
  static const _favoritesKey = 'favorite_property_titles';
  static const _recentKey = 'recent_property_titles';
  static const _draftsKey = 'property_drafts';
  static const _localeKey = 'app_locale';
  static String localeCode = 'en';
  static final favoriteTitles = ValueNotifier<Set<String>>(<String>{});
  static final drafts = ValueNotifier<List<Map<String, String>>>(
    <Map<String, String>>[],
  );
  static Future<void>? _initialization;

  static Future<void> initialize() => _initialization ??= _loadFavorites();

  static Future<void> _loadFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    favoriteTitles.value =
        prefs.getStringList(_favoritesKey)?.toSet() ?? <String>{};
    drafts.value = _decodeDrafts(prefs.getStringList(_draftsKey) ?? const []);
    localeCode = prefs.getString(_localeKey) ?? 'en';
  }

  static List<Map<String, String>> _decodeDrafts(List<String> rows) => rows
      .map((row) {
        try {
          return (jsonDecode(row) as Map<String, dynamic>).map(
            (key, value) => MapEntry(key, value?.toString() ?? ''),
          );
        } catch (_) {
          return <String, String>{};
        }
      })
      .where((draft) => draft.isNotEmpty)
      .toList();

  static Future<Set<String>> favorites() async {
    await initialize();
    return Set<String>.of(favoriteTitles.value);
  }

  static Future<void> toggleFavorite(String title) async {
    await initialize();
    final prefs = await SharedPreferences.getInstance();
    final values = Set<String>.of(favoriteTitles.value);
    values.contains(title) ? values.remove(title) : values.add(title);
    favoriteTitles.value = values;
    await prefs.setStringList(_favoritesKey, values.toList());
  }

  static Future<void> viewed(String title) async {
    final prefs = await SharedPreferences.getInstance();
    final values = prefs.getStringList(_recentKey) ?? <String>[];
    values.remove(title);
    values.insert(0, title);
    await prefs.setStringList(_recentKey, values.take(10).toList());
  }

  static Future<List<String>> recentlyViewed() async =>
      (await SharedPreferences.getInstance()).getStringList(_recentKey) ?? [];

  static Future<void> saveDraft(Map<String, String> draft) async {
    await initialize();
    final prefs = await SharedPreferences.getInstance();
    final drafts = prefs.getStringList(_draftsKey) ?? <String>[];
    drafts.insert(0, jsonEncode(draft));
    final stored = drafts.take(20).toList();
    await prefs.setStringList(_draftsKey, stored);
    LocalStore.drafts.value = _decodeDrafts(stored);
  }

  static Future<void> deleteDraft(String createdAt) async {
    await initialize();
    final prefs = await SharedPreferences.getInstance();
    final next = List<Map<String, String>>.of(drafts.value)
      ..removeWhere((draft) => draft['createdAt'] == createdAt);
    await prefs.setStringList(_draftsKey, next.map(jsonEncode).toList());
    drafts.value = next;
  }

  static Future<void> setLocale(String code) async {
    localeCode = code;
    await (await SharedPreferences.getInstance()).setString(_localeKey, code);
  }
}

const _translations = <String, Map<String, String>>{
  'ja': {'home': 'ホーム', 'explore': '検索', 'saved': '保存済み', 'profile': 'プロフィール'},
  'fr': {
    'home': 'Accueil',
    'explore': 'Explorer',
    'saved': 'Favoris',
    'profile': 'Profil',
  },
  'es': {
    'home': 'Inicio',
    'explore': 'Explorar',
    'saved': 'Guardados',
    'profile': 'Perfil',
  },
  'vi': {
    'home': 'Trang chủ',
    'explore': 'Khám phá',
    'saved': 'Đã lưu',
    'profile': 'Hồ sơ',
  },
};
String tr(BuildContext context, String key) =>
    _translations[Localizations.localeOf(context).languageCode]?[key] ??
    {
      'home': 'Home',
      'explore': 'Explore',
      'saved': 'Saved',
      'profile': 'Profile',
    }[key] ??
    key;
