import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:propertio/main.dart';

void main() {
  testWidgets('renders the Propertio home screen', (tester) async {
    await tester.pumpWidget(const PropertioApp(initialAuthenticated: true));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('James Butler'), findsOneWidget);
    expect(find.text('Featured property'), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
  });

  testWidgets('explore opens a real map with property markers', (tester) async {
    await tester.pumpWidget(const PropertioApp(initialAuthenticated: true));
    await tester.pump(const Duration(milliseconds: 500));

    await tester.tap(find.text('Explore'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 5));

    expect(find.byType(FlutterMap), findsOneWidget);
    expect(find.text(r'$267K'), findsOneWidget);
  });
}
