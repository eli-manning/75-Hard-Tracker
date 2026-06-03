import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={16} color={colors.accent} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        <Text style={styles.title}>TERMS OF SERVICE</Text>

        <Text style={styles.body}>
          {`Last updated: June 2024\n\n`}
          {`By using 75 Hard Tracker, you agree to these terms.\n\n`}
          {`USE OF SERVICE\n\n75 Hard Tracker is provided as-is for personal use. The app is designed to help track the 75 Hard challenge. We are not affiliated with the creators of the 75 Hard program.\n\n`}
          {`USER CONDUCT\n\nYou are responsible for maintaining the confidentiality of your account. Do not share your credentials with others.\n\n`}
          {`DATA\n\nYou retain ownership of your data. We do not claim any rights to your personal information or challenge data.\n\n`}
          {`DISCLAIMER\n\nThis app is provided "as is" without warranty of any kind. We are not liable for any health decisions made based on data tracked in this app. Always consult a healthcare professional before starting an exercise program.\n\n`}
          {`CONTACT\n\nFor questions, contact eli.patrick.manning@gmail.com.`}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  backText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.accent },
  title: { fontFamily: fonts.pixel, fontSize: 12, color: colors.accent, marginBottom: 24, lineHeight: 20 },
  body: { fontFamily: fonts.inter, fontSize: 13, color: colors.text, lineHeight: 22 },
});
