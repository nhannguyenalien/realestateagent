part of 'main.dart';

class WelcomeFlow extends StatefulWidget {
  const WelcomeFlow({super.key, required this.onAuthenticated});
  final VoidCallback onAuthenticated;
  @override
  State<WelcomeFlow> createState() => _WelcomeFlowState();
}

class _WelcomeFlowState extends State<WelcomeFlow> {
  int page = 0;
  bool login = true;
  final controller = PageController();

  @override
  Widget build(BuildContext context) {
    if (page == 3) {
      return AuthScreen(
        login: login,
        onToggle: () => setState(() => login = !login),
        onAuthenticated: widget.onAuthenticated,
      );
    }
    const slides = [
      (
        Icons.real_estate_agent_rounded,
        'Sell your property',
        'Reach verified buyers and manage every inquiry in one place.',
      ),
      (
        Icons.villa_rounded,
        'Buy your dream home',
        'Explore trusted listings and find a home that fits your life.',
      ),
      (
        Icons.handshake_rounded,
        'Connect with experts',
        'Schedule tours, compare homes and make confident decisions.',
      ),
    ];
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => setState(() => page = 3),
                  child: const Text('Skip'),
                ),
              ),
              const Spacer(),
              Container(
                width: 230,
                height: 230,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      brand.withValues(alpha: .2),
                      brand.withValues(alpha: .04),
                    ],
                  ),
                  shape: BoxShape.circle,
                ),
                child: Icon(slides[page].$1, size: 112, color: brand),
              ),
              const SizedBox(height: 44),
              Text(
                slides[page].$2,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                slides[page].$3,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey, height: 1.5),
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  3,
                  (i) => AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: i == page ? 28 : 8,
                    height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: i == page
                          ? brand
                          : Colors.grey.withValues(alpha: .3),
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 25),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: brand),
                  onPressed: () => setState(() => page++),
                  child: Text(page == 2 ? 'Get started' : 'Next'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.login,
    required this.onToggle,
    required this.onAuthenticated,
  });
  final bool login;
  final VoidCallback onToggle, onAuthenticated;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool hidden = true;
  bool loading = false;
  final formKey = GlobalKey<FormState>();

  Future<void> google() async {
    setState(() => loading = true);
    try {
      await AuthRepository.instance.signInWithGoogle();
      if (mounted) widget.onAuthenticated();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to sign in with Google.')),
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> submit() async {
    if (!(formKey.currentState?.validate() ?? false)) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Email/password authentication is not enabled. Continue with Google.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: formKey,
            child: Column(
              children: [
                Container(
                  width: 62,
                  height: 62,
                  decoration: BoxDecoration(
                    color: brand,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(
                    Icons.home_work_rounded,
                    color: Colors.white,
                    size: 34,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Propertio',
                  style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 40),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    widget.login ? 'Welcome back' : 'Create your account',
                    style: const TextStyle(
                      fontSize: 27,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(height: 22),
                if (!widget.login) ...[
                  TextFormField(
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.person_outline),
                      hintText: 'Full name',
                    ),
                    validator: (v) =>
                        (v ?? '').trim().length < 2 ? 'Enter your name' : null,
                  ),
                  const SizedBox(height: 12),
                ],
                TextFormField(
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.email_outlined),
                    hintText: 'Email address',
                  ),
                  validator: (v) =>
                      !(v ?? '').contains('@') ? 'Enter a valid email' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  obscureText: hidden,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.lock_outline),
                    hintText: 'Password',
                    suffixIcon: IconButton(
                      onPressed: () => setState(() => hidden = !hidden),
                      icon: Icon(
                        hidden
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                    ),
                  ),
                  validator: (v) =>
                      (v ?? '').length < 6 ? 'Use at least 6 characters' : null,
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: FilledButton(
                    onPressed: loading ? null : submit,
                    style: FilledButton.styleFrom(backgroundColor: brand),
                    child: loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(widget.login ? 'Login' : 'Register'),
                  ),
                ),
                const SizedBox(height: 18),
                const Row(
                  children: [
                    Expanded(child: Divider()),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        'or continue with',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                    Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: loading ? null : google,
                        icon: const Text(
                          'G',
                          style: TextStyle(fontWeight: FontWeight.w900),
                        ),
                        label: const Text('Google'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: null,
                        icon: const Icon(Icons.apple),
                        label: const Text('Apple'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                TextButton(
                  onPressed: widget.onToggle,
                  child: Text(
                    widget.login
                        ? 'New here? Create account'
                        : 'Already registered? Login',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class PropertyFilters {
  const PropertyFilters({
    required this.price,
    required this.beds,
    required this.type,
  });

  final RangeValues price;
  final int beds;
  final String type;

  bool get isActive =>
      price.start > 0 || price.end < 1000000 || beds > 0 || type != 'All';

  String get priceLabel =>
      '\$${(price.start / 1000).round()}K–\$${(price.end / 1000).round()}K';

  bool matches(Property property) =>
      property.numericPrice >= price.start &&
      property.numericPrice <= price.end &&
      property.beds >= beds &&
      (type == 'All' || property.type.toLowerCase() == type.toLowerCase());
}

class FilterSheet extends StatefulWidget {
  const FilterSheet({super.key, this.initial});
  final PropertyFilters? initial;
  @override
  State<FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<FilterSheet> {
  late RangeValues price;
  late int beds;
  late String type;

  @override
  void initState() {
    super.initState();
    price = widget.initial?.price ?? const RangeValues(0, 1000000);
    beds = widget.initial?.beds ?? 0;
    type = widget.initial?.type ?? 'All';
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: EdgeInsets.fromLTRB(
        22,
        18,
        22,
        18 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Filters',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'Property type',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: ['All', 'House', 'Apartment', 'Office', 'Land']
                .map(
                  (v) => ChoiceChip(
                    label: Text(v),
                    selected: type == v,
                    onSelected: (_) => setState(() => type = v),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 22),
          Text(
            'Price range  \$${price.start.round()} - \$${price.end.round()}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          RangeSlider(
            values: price,
            min: 0,
            max: 1000000,
            divisions: 20,
            onChanged: (v) => setState(() => price = v),
          ),
          const SizedBox(height: 10),
          const Text('Bedrooms', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: List.generate(
              6,
              (i) => ChoiceChip(
                label: Text(
                  i == 0
                      ? 'Any'
                      : i == 5
                      ? '5+'
                      : '$i',
                ),
                selected: beds == i,
                onSelected: (_) => setState(() => beds = i),
              ),
            ),
          ),
          const SizedBox(height: 26),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() {
                    price = const RangeValues(0, 1000000);
                    beds = 0;
                    type = 'All';
                  }),
                  child: const Text('Reset'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: brand),
                  onPressed: () => Navigator.pop(
                    context,
                    PropertyFilters(price: price, beds: beds, type: type),
                  ),
                  child: const Text('Show properties'),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Notifications')),
    body: ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: 6,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (_, i) => Card(
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: brand.withValues(alpha: .15),
            child: Icon(
              i.isEven
                  ? Icons.local_offer_outlined
                  : Icons.event_available_outlined,
              color: brand,
            ),
          ),
          title: Text(
            i.isEven
                ? 'New property matches your search'
                : 'Tour appointment confirmed',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: Text(
            i.isEven
                ? 'A home in Manhattan is now available.'
                : 'Saturday at 10:30 AM with James Butler.',
          ),
          trailing: i < 2 ? const Badge() : null,
        ),
      ),
    ),
  );
}

class ScheduleScreen extends StatelessWidget {
  const ScheduleScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Viewing schedule')),
    body: FutureBuilder<List<Map<String, dynamic>>>(
      future: PropertyRepository.instance.viewings(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text(snapshot.error.toString()));
        }
        final items = snapshot.data ?? const [];
        if (items.isEmpty) {
          return const Center(child: Text('No viewing appointments yet.'));
        }
        return ListView.separated(
          padding: const EdgeInsets.all(20),
          itemCount: items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (_, i) {
            final item = items[i],
                date = DateTime.tryParse(item['startsAt']?.toString() ?? '');
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: propertyImage(
                        item['imageUrl']?.toString() ?? '',
                        width: 86,
                        height: 82,
                      ),
                    ),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['title']?.toString() ?? 'Property viewing',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 7),
                          Text(
                            date == null
                                ? 'Date pending'
                                : '${date.toLocal()} • ${item['status']}',
                            style: const TextStyle(color: brand),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            [
                              item['city'],
                              item['region'],
                            ].where((e) => e != null).join(', '),
                            style: const TextStyle(
                              color: Colors.grey,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    ),
  );
}

class BookingSheet extends StatefulWidget {
  const BookingSheet({super.key, required this.property});
  final Property property;
  @override
  State<BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends State<BookingSheet> {
  int day = 0, time = 0;
  bool saving = false;
  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.all(22),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tour ${widget.property.title}',
            style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          const Text(
            'Choose a convenient date and time',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 22),
          SizedBox(
            height: 76,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 7,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, i) => ChoiceChip(
                label: SizedBox(
                  width: 42,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i],
                      ),
                      Text(
                        '${5 + i}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                selected: day == i,
                onSelected: (_) => setState(() => day = i),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            children: ['9:00 AM', '10:30 AM', '2:00 PM', '4:30 PM']
                .asMap()
                .entries
                .map(
                  (e) => ChoiceChip(
                    label: Text(e.value),
                    selected: time == e.key,
                    onSelected: (_) => setState(() => time = e.key),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton(
              style: FilledButton.styleFrom(backgroundColor: brand),
              onPressed: saving
                  ? null
                  : () async {
                      setState(() => saving = true);
                      final slots = [9, 10, 14, 16], minutes = [0, 30, 0, 30];
                      final now = DateTime.now(),
                          startsAt = DateTime(
                            now.year,
                            now.month,
                            now.day + day + 1,
                            slots[time],
                            minutes[time],
                          );
                      try {
                        await PropertyRepository.instance.scheduleViewing(
                          widget.property,
                          startsAt,
                        );
                        if (!context.mounted) return;
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Tour request sent successfully'),
                          ),
                        );
                      } on ApiException catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(
                            context,
                          ).showSnackBar(SnackBar(content: Text(e.message)));
                        }
                      } finally {
                        if (mounted) setState(() => saving = false);
                      }
                    },
              child: Text(saving ? 'Scheduling…' : 'Confirm appointment'),
            ),
          ),
        ],
      ),
    ),
  );
}

class CostEstimatorScreen extends StatefulWidget {
  const CostEstimatorScreen({super.key});
  @override
  State<CostEstimatorScreen> createState() => _CostEstimatorScreenState();
}

class _CostEstimatorScreenState extends State<CostEstimatorScreen> {
  double area = 2000;
  String quality = 'Standard';
  @override
  Widget build(BuildContext context) {
    final rate = quality == 'Basic'
        ? 95
        : quality == 'Premium'
        ? 185
        : 135;
    final total = area * rate;
    return Scaffold(
      appBar: AppBar(title: const Text('Estimated cost')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            height: 180,
            decoration: BoxDecoration(
              color: brand,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.architecture, color: Colors.white, size: 48),
                const SizedBox(height: 12),
                const Text(
                  'Estimated construction cost',
                  style: TextStyle(color: Colors.white70),
                ),
                Text(
                  '\$${total.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          Text(
            'House area: ${area.round()} sqft',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          Slider(
            value: area,
            min: 500,
            max: 5000,
            divisions: 45,
            onChanged: (v) => setState(() => area = v),
          ),
          const SizedBox(height: 16),
          const Text(
            'Build quality',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'Basic', label: Text('Basic')),
              ButtonSegment(value: 'Standard', label: Text('Standard')),
              ButtonSegment(value: 'Premium', label: Text('Premium')),
            ],
            selected: {quality},
            onSelectionChanged: (v) => setState(() => quality = v.first),
          ),
          const SizedBox(height: 24),
          ...[
            ('Materials', .48),
            ('Labor', .32),
            ('Design & permits', .12),
            ('Contingency', .08),
          ].map(
            (e) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(e.$1),
              trailing: Text(
                '\$${(total * e.$2).toStringAsFixed(0)}',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
