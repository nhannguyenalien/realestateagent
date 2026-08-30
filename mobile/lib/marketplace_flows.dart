part of 'main.dart';

class PropertyMap extends StatefulWidget {
  const PropertyMap({super.key, required this.properties});
  final List<Property> properties;
  @override
  State<PropertyMap> createState() => _PropertyMapState();
}

class _PropertyMapState extends State<PropertyMap> {
  int? active;

  @override
  void didUpdateWidget(covariant PropertyMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (active != null && active! >= widget.properties.length) {
      active = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final center = widget.properties.isEmpty
        ? const LatLng(40.7128, -74.0060)
        : LatLng(
            widget.properties.first.latitude,
            widget.properties.first.longitude,
          );
    return Stack(
      children: [
        Positioned.fill(
          child: FlutterMap(
            options: MapOptions(
              initialCenter: center,
              initialZoom: 10.5,
              onTap: (_, _) => setState(() => active = null),
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
              ),
              MarkerLayer(
                markers: [
                  for (var i = 0; i < widget.properties.length; i++)
                    Marker(
                      point: LatLng(
                        widget.properties[i].latitude,
                        widget.properties[i].longitude,
                      ),
                      width: 86,
                      height: 46,
                      child: GestureDetector(
                        onTap: () => setState(() => active = i),
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: active == i
                                  ? brand
                                  : Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: const [
                                BoxShadow(color: Colors.black38, blurRadius: 8),
                              ],
                            ),
                            child: Text(
                              widget.properties[i].price.replaceAll(
                                ',000',
                                'K',
                              ),
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const RichAttributionWidget(
                attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                  TextSourceAttribution('CARTO'),
                ],
              ),
            ],
          ),
        ),
        if (active != null && active! < widget.properties.length)
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: SizedBox(
              height: 138,
              child: PropertyCard(property: widget.properties[active!]),
            ),
          ),
      ],
    );
  }
}

class CompareScreen extends StatelessWidget {
  const CompareScreen({super.key, required this.properties});
  final List<Property> properties;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Compare properties')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      scrollDirection: Axis.horizontal,
      children: properties
          .map(
            (p) => SizedBox(
              width: 230,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: propertyImage(
                          p.image,
                          height: 160,
                          width: double.infinity,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        p.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        p.price,
                        style: const TextStyle(
                          color: brand,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Divider(height: 30),
                      _compareRow('Bedrooms', '${p.beds}'),
                      _compareRow('Bathrooms', '${p.baths}'),
                      _compareRow('Area', '${p.area} sqft'),
                      const Spacer(),
                      FilledButton(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PropertyDetail(property: p),
                          ),
                        ),
                        child: const Text('View property'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          )
          .toList(),
    ),
  );
  Widget _compareRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 9),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
      ],
    ),
  );
}

class AgentDashboardScreen extends StatefulWidget {
  const AgentDashboardScreen({super.key});

  @override
  State<AgentDashboardScreen> createState() => _AgentDashboardScreenState();
}

class _AgentDashboardScreenState extends State<AgentDashboardScreen> {
  int viewedCount = 0;
  late Future<List<Map<String, dynamic>>> remoteListings;

  @override
  void initState() {
    super.initState();
    LocalStore.initialize();
    remoteListings = PropertyRepository.instance.agentListings();
    LocalStore.recentlyViewed().then((value) {
      if (mounted) setState(() => viewedCount = value.length);
    });
  }

  @override
  Widget build(
    BuildContext context,
  ) => ValueListenableBuilder<List<Map<String, String>>>(
    valueListenable: LocalStore.drafts,
    builder: (context, drafts, _) => Scaffold(
      appBar: AppBar(title: const Text('Agent dashboard')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          builder: (_) => const AddPropertySheet(),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Add listing'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Good morning, James',
            style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 5),
          const Text(
            'Live activity from this device and the property API.',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 18),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 1.45,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            children: [
              _Metric(
                '${PropertyRepository.instance.latestProperties.length}',
                'Public listings',
                Icons.home_work_outlined,
              ),
              _Metric(
                '${drafts.length}',
                'Local drafts',
                Icons.edit_note_outlined,
              ),
              _Metric(
                '${LocalStore.favoriteTitles.value.length}',
                'Saved properties',
                Icons.favorite_outline,
              ),
              _Metric(
                '$viewedCount',
                'Recently viewed',
                Icons.visibility_outlined,
              ),
            ],
          ),
          const SizedBox(height: 24),
          const SectionTitle('My listings'),
          if (drafts.isNotEmpty)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () async {
                  try {
                    final count = await PropertyRepository.instance
                        .syncOfflineDrafts();
                    if (!context.mounted) return;
                    setState(
                      () => remoteListings = PropertyRepository.instance
                          .agentListings(),
                    );
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('$count offline draft(s) synced')),
                    );
                  } on ApiException catch (error) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(SnackBar(content: Text(error.message)));
                    }
                  }
                },
                icon: const Icon(Icons.sync),
                label: const Text('Sync offline drafts'),
              ),
            ),
          const SizedBox(height: 10),
          FutureBuilder<List<Map<String, dynamic>>>(
            future: remoteListings,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator(),
                  ),
                );
              }
              if (snapshot.hasError) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        const Text(
                          'Backend is unavailable. Local drafts remain safe.',
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => setState(
                            () => remoteListings = PropertyRepository.instance
                                .agentListings(),
                          ),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                );
              }
              final items = snapshot.data ?? const [];
              if (items.isEmpty) {
                return const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No server listings yet. Add your first property.',
                    ),
                  ),
                );
              }
              return Column(
                children: items
                    .map(
                      (item) => _RemoteListingCard(
                        item: item,
                        onChanged: () => setState(
                          () => remoteListings = PropertyRepository.instance
                              .agentListings(),
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
          if (drafts.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  children: [
                    Icon(Icons.edit_note, color: brand, size: 42),
                    SizedBox(height: 10),
                    Text(
                      'No offline drafts',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    SizedBox(height: 5),
                    Text(
                      'Use Add listing to create your first property draft.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                  ],
                ),
              ),
            )
          else
            ...drafts.map((draft) => _DraftListingCard(draft: draft)),
          const SizedBox(height: 90),
        ],
      ),
    ),
  );
}

class _RemoteListingCard extends StatelessWidget {
  const _RemoteListingCard({required this.item, required this.onChanged});
  final Map<String, dynamic> item;
  final VoidCallback onChanged;
  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      title: Text(
        item['title']?.toString() ?? 'Listing',
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
      subtitle: Text('${item['city'] ?? ''} • ${item['status'] ?? 'draft'}'),
      onTap: () => showDialog<void>(
        context: context,
        builder: (_) => _EditListingDialog(item: item, onChanged: onChanged),
      ),
      trailing: PopupMenuButton<String>(
        onSelected: (status) async {
          try {
            await PropertyRepository.instance.updateListing(
              item['id'].toString(),
              {'status': status},
            );
            onChanged();
          } on ApiException catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text(e.message)));
            }
          }
        },
        itemBuilder: (_) => const [
          PopupMenuItem(value: 'draft', child: Text('Move to draft')),
          PopupMenuItem(value: 'published', child: Text('Publish')),
          PopupMenuItem(value: 'archived', child: Text('Archive')),
        ],
      ),
    ),
  );
}

class _EditListingDialog extends StatefulWidget {
  const _EditListingDialog({required this.item, required this.onChanged});
  final Map<String, dynamic> item;
  final VoidCallback onChanged;
  @override
  State<_EditListingDialog> createState() => _EditListingDialogState();
}

class _EditListingDialogState extends State<_EditListingDialog> {
  late final title = TextEditingController(
    text: widget.item['title']?.toString(),
  );
  late final description = TextEditingController(
    text: widget.item['description']?.toString(),
  );
  late final price = TextEditingController(
    text: widget.item['price']?.toString(),
  );
  bool saving = false;
  @override
  void dispose() {
    title.dispose();
    description.dispose();
    price.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Edit listing'),
    content: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: title,
            decoration: const InputDecoration(labelText: 'Title'),
          ),
          TextField(
            controller: description,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Description'),
          ),
          TextField(
            controller: price,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Price'),
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: saving ? null : () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: saving
            ? null
            : () async {
                setState(() => saving = true);
                try {
                  await PropertyRepository.instance
                      .updateListing(widget.item['id'].toString(), {
                        'title': title.text.trim(),
                        'description': description.text.trim(),
                        'price': double.tryParse(price.text),
                      });
                  widget.onChanged();
                  if (context.mounted) Navigator.pop(context);
                } on ApiException catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(SnackBar(content: Text(e.message)));
                  }
                  setState(() => saving = false);
                }
              },
        child: Text(saving ? 'Saving…' : 'Save'),
      ),
    ],
  );
}

class AgentNetworkScreen extends StatelessWidget {
  const AgentNetworkScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Agents & agencies')),
    body: FutureBuilder<List<List<Map<String, dynamic>>>>(
      future: Future.wait([
        PropertyRepository.instance.agencies(),
        PropertyRepository.instance.agents(),
      ]),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Could not load the network.\n${snapshot.error}',
                textAlign: TextAlign.center,
              ),
            ),
          );
        }
        final agencies = snapshot.data![0], agents = snapshot.data![1];
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SectionTitle('Agencies'),
            const SizedBox(height: 8),
            if (agencies.isEmpty)
              const Text('No agencies available.')
            else
              ...agencies.map(
                (a) => Card(
                  child: ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.business)),
                    title: Text(a['name']?.toString() ?? 'Agency'),
                    subtitle: Text(
                      '${a['city'] ?? ''} • ${a['agentCount'] ?? 0} agents • ${a['listingCount'] ?? 0} listings',
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 20),
            const SectionTitle('Agents'),
            const SizedBox(height: 8),
            if (agents.isEmpty)
              const Text('No agents available.')
            else
              ...agents.map(
                (a) => Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundImage: a['avatarUrl'] == null
                          ? null
                          : NetworkImage(a['avatarUrl'].toString()),
                      child: a['avatarUrl'] == null
                          ? const Icon(Icons.person)
                          : null,
                    ),
                    title: Text(a['name']?.toString() ?? 'Agent'),
                    subtitle: Text(
                      '${a['agency'] ?? 'Independent'} • ${a['listingCount'] ?? 0} listings\n${a['email'] ?? ''}',
                    ),
                    isThreeLine: true,
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}

class AgentLeadsScreen extends StatelessWidget {
  const AgentLeadsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Lead inbox')),
    body: FutureBuilder<List<Map<String, dynamic>>>(
      future: PropertyRepository.instance.leads(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Could not load leads: ${snapshot.error}'));
        }
        final rows = snapshot.data ?? const [];
        if (rows.isEmpty) {
          return const _EmptyCollection(
            icon: Icons.inbox_outlined,
            title: 'No leads yet',
            message: 'Property enquiries assigned to you will appear here.',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(20),
          itemCount: rows.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final l = rows[i];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                title: Text(l['name']?.toString() ?? 'Lead'),
                subtitle: Text(
                  '${l['property'] ?? 'General enquiry'}\n${l['message'] ?? ''}',
                ),
                isThreeLine: true,
                trailing: Chip(label: Text(l['status']?.toString() ?? 'new')),
              ),
            );
          },
        );
      },
    ),
  );
}

class _DraftListingCard extends StatelessWidget {
  const _DraftListingCard({required this.draft});
  final Map<String, String> draft;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      contentPadding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
      leading: CircleAvatar(
        backgroundColor: brand.withValues(alpha: .14),
        child: const Icon(Icons.home_work_outlined, color: brand),
      ),
      title: Text(
        draft['title'] ?? 'Untitled property',
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
      subtitle: Text(
        '${draft['address'] ?? ''}\n\$${draft['price'] ?? '0'} • ${draft['area'] ?? '0'} sqft',
      ),
      isThreeLine: true,
      trailing: PopupMenuButton<String>(
        onSelected: (value) {
          if (value == 'delete') {
            LocalStore.deleteDraft(draft['createdAt'] ?? '');
          }
        },
        itemBuilder: (_) => const [
          PopupMenuItem(value: 'delete', child: Text('Delete draft')),
        ],
      ),
    ),
  );
}

class _Metric extends StatelessWidget {
  const _Metric(this.value, this.label, this.icon);
  final String value, label;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: brand),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    ),
  );
}

class AddPropertySheet extends StatefulWidget {
  const AddPropertySheet({super.key});

  @override
  State<AddPropertySheet> createState() => _AddPropertySheetState();
}

class _AddPropertySheetState extends State<AddPropertySheet> {
  final formKey = GlobalKey<FormState>();
  final titleController = TextEditingController();
  final addressController = TextEditingController();
  final priceController = TextEditingController();
  final areaController = TextEditingController();
  final cityController = TextEditingController();
  XFile? media;
  bool saving = false;

  @override
  void dispose() {
    titleController.dispose();
    addressController.dispose();
    priceController.dispose();
    areaController.dispose();
    cityController.dispose();
    super.dispose();
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'This field is required' : null;

  String? _positiveNumber(String? value) {
    final number = double.tryParse(value ?? '');
    return number == null || number <= 0 ? 'Enter a valid number' : null;
  }

  Future<void> _save() async {
    if (!(formKey.currentState?.validate() ?? false)) return;
    setState(() => saving = true);
    final local = {
      'title': titleController.text.trim(),
      'address': addressController.text.trim(),
      'price': priceController.text.trim(),
      'area': areaController.text.trim(),
      'city': cityController.text.trim(),
      'createdAt': DateTime.now().toIso8601String(),
    };
    try {
      String? mediaUrl;
      if (media != null) {
        mediaUrl = (await ApiClient.instance.upload(media!))['url']?.toString();
      }
      await PropertyRepository.instance.createDraft({
        'title': local['title'],
        'address': local['address'],
        'city': local['city'],
        'price': double.parse(local['price']!),
        'areaSqm': double.parse(local['area']!),
        'imageUrl': mediaUrl,
        'propertyType': 'house',
      });
    } catch (error) {
      await LocalStore.saveDraft(local);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Saved offline; sync will retry when the backend is available. ${error is ApiException ? error.message : ''}',
            ),
          ),
        );
      }
    }
    if (!mounted) return;
    Navigator.pop(context);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Draft listing saved')));
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      18,
      20,
      MediaQuery.viewInsetsOf(context).bottom + 24,
    ),
    child: Form(
      key: formKey,
      child: ListView(
        shrinkWrap: true,
        children: [
          const Text(
            'Create a listing',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 18),
          TextFormField(
            controller: titleController,
            validator: _required,
            decoration: const InputDecoration(labelText: 'Property title'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: addressController,
            validator: _required,
            decoration: const InputDecoration(labelText: 'Address'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: cityController,
            validator: _required,
            decoration: const InputDecoration(labelText: 'City'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: priceController,
                  validator: _positiveNumber,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Price'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextFormField(
                  controller: areaController,
                  validator: _positiveNumber,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Area'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: saving
                ? null
                : () async {
                    final picked = await ImagePicker().pickMedia();
                    if (picked != null) setState(() => media = picked);
                  },
            icon: const Icon(Icons.add_photo_alternate_outlined),
            label: Text(media?.name ?? 'Upload photo or video'),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: saving ? null : _save,
            child: Text(saving ? 'Saving…' : 'Save draft'),
          ),
        ],
      ),
    ),
  );
}
